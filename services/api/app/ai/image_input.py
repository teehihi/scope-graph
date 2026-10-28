"""Bounded in-memory screenshot input for the provider boundary.

This checks PNG/JPEG structure and dimensions without a new decoder dependency.
The eventual upload handler must additionally perform a full image decode.
"""

import base64
import hashlib
import struct
import zlib

from app.core.config import settings


class ValidatedScreenshot:
    __slots__ = ("_data", "mime_type", "width", "height", "sha256")

    def __init__(self, data: bytes, mime_type: str):
        if type(data) is not bytes or not data:
            raise ValueError("Screenshot content is required")
        if len(data) > settings.MAX_SCREENSHOT_BYTES:
            raise ValueError("Screenshot exceeds configured size limit")
        if mime_type not in ("image/png", "image/jpeg"):
            raise ValueError("Unsupported screenshot MIME type")

        if mime_type == "image/png":
            width, height = self._png_dimensions(data)
        else:
            width, height = self._jpeg_dimensions(data)
        if width < 1 or height < 1 or max(width, height) > settings.MAX_SCREENSHOT_DIMENSION:
            raise ValueError("Screenshot exceeds configured dimensions")
        if width * height > settings.MAX_SCREENSHOT_PIXELS:
            raise ValueError("Screenshot exceeds configured pixel limit")

        self._data = data
        self.mime_type = mime_type
        self.width = width
        self.height = height
        self.sha256 = hashlib.sha256(data).hexdigest()

    @classmethod
    def from_bytes(cls, data: bytes, mime_type: str) -> "ValidatedScreenshot":
        return cls(data, mime_type)

    @staticmethod
    def _png_dimensions(data: bytes) -> tuple[int, int]:
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("Malformed PNG screenshot")
        offset = 8
        dimensions = None
        expected_raw = None
        row_length = None
        compressed = bytearray()
        seen_end = False
        while offset + 12 <= len(data):
            length = struct.unpack_from(">I", data, offset)[0]
            end = offset + 12 + length
            if end > len(data):
                break
            kind = data[offset + 4:offset + 8]
            payload = data[offset + 8:offset + 8 + length]
            actual_crc = zlib.crc32(kind + payload) & 0xffffffff
            declared_crc = struct.unpack_from(">I", data, end - 4)[0]
            if actual_crc != declared_crc:
                break
            if dimensions is None:
                if kind != b"IHDR" or length != 13:
                    break
                dimensions = struct.unpack_from(">II", payload)
                if dimensions[0] < 1 or dimensions[1] < 1:
                    break
                bit_depth, color_type, compression, filter_method, interlace = payload[8:13]
                allowed_depths = {0: (1, 2, 4, 8, 16), 2: (8, 16), 3: (1, 2, 4, 8),
                                  4: (8, 16), 6: (8, 16)}
                if (bit_depth not in allowed_depths.get(color_type, ()) or compression != 0
                        or filter_method != 0 or interlace not in (0, 1)):
                    break
                if interlace == 0:
                    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color_type]
                    row_length = 1 + (dimensions[0] * bit_depth * channels + 7) // 8
                    expected_raw = row_length * dimensions[1]
                if (max(dimensions) > settings.MAX_SCREENSHOT_DIMENSION
                        or dimensions[0] * dimensions[1] > settings.MAX_SCREENSHOT_PIXELS):
                    return dimensions
            elif kind == b"IDAT":
                compressed.extend(payload)
            elif kind == b"IEND":
                seen_end = length == 0 and end == len(data)
                break
            offset = end
        if not (dimensions and compressed and seen_end):
            raise ValueError("Malformed PNG screenshot")
        try:
            decoder = zlib.decompressobj()
            max_raw = dimensions[0] * dimensions[1] * 8 + dimensions[1] * 4
            decoded = decoder.decompress(compressed, max_raw + 1)
            if len(decoded) > max_raw or not decoder.eof or decoder.unconsumed_tail or decoder.unused_data:
                raise ValueError("Malformed PNG screenshot")
            if expected_raw is not None and (
                len(decoded) != expected_raw
                or any(decoded[row * row_length] > 4 for row in range(dimensions[1]))
            ):
                raise ValueError("Malformed PNG screenshot")
        except zlib.error:
            raise ValueError("Malformed PNG screenshot") from None
        return dimensions

    @staticmethod
    def _jpeg_dimensions(data: bytes) -> tuple[int, int]:
        if not data.startswith(b"\xff\xd8") or not data.endswith(b"\xff\xd9"):
            raise ValueError("Malformed JPEG screenshot")
        offset = 2
        dimensions = None
        saw_scan = False
        sof_markers = {0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf}
        while offset + 4 <= len(data):
            if data[offset] != 0xff:
                break
            while offset < len(data) and data[offset] == 0xff:
                offset += 1
            if offset >= len(data):
                break
            marker = data[offset]
            offset += 1
            if marker == 0xda:
                if offset + 2 > len(data):
                    break
                scan_length = struct.unpack_from(">H", data, offset)[0]
                if scan_length < 6 or offset + scan_length >= len(data) - 2:
                    break
                saw_scan = True
                break
            if marker in (0xd8, 0xd9, 0x01) or 0xd0 <= marker <= 0xd7:
                break
            if offset + 2 > len(data):
                break
            length = struct.unpack_from(">H", data, offset)[0]
            if length < 2 or offset + length > len(data):
                break
            if marker in sof_markers:
                if length < 7:
                    break
                height, width = struct.unpack_from(">HH", data, offset + 3)
                dimensions = (width, height)
            offset += length
        if not (dimensions and saw_scan and all(dimensions)):
            raise ValueError("Malformed JPEG screenshot")
        return dimensions

    def data_url(self) -> str:
        return f"data:{self.mime_type};base64,{base64.b64encode(self._data).decode('ascii')}"

    def __repr__(self) -> str:
        return f"ValidatedScreenshot(mime_type={self.mime_type!r}, width={self.width}, height={self.height})"
