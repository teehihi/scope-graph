"""Bound screenshot multipart bodies before Starlette parses upload fields."""

from starlette.responses import JSONResponse

from app.core.config import settings


class ScreenshotRequestBodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        path = scope.get("path", "")
        if (
            scope["type"] != "http"
            or scope.get("method") != "POST"
            or not path.startswith("/api/v1/repositories/")
            or not path.endswith("/analyze-screenshot")
        ):
            await self.app(scope, receive, send)
            return

        # Allow bounded multipart framing and a short requirement alongside the image.
        limit = settings.MAX_SCREENSHOT_BYTES + 1_000_000
        for name, value in scope.get("headers", []):
            if name.lower() == b"content-length":
                try:
                    if int(value) > limit:
                        await self._reject(scope, receive, send)
                        return
                except ValueError:
                    pass

        # Buffer only this bounded endpoint so an oversized streamed upload is
        # rejected before FastAPI's multipart parser can consume any fields.
        messages = []
        consumed = 0
        while True:
            message = await receive()
            if message["type"] != "http.request":
                return
            consumed += len(message.get("body", b""))
            if consumed > limit:
                await self._reject(scope, receive, send)
                return
            messages.append(message)
            if not message.get("more_body", False):
                break

        async def replay_receive():
            if messages:
                return messages.pop(0)
            return {"type": "http.disconnect"}

        await self.app(scope, replay_receive, send)

    @staticmethod
    async def _reject(scope, receive, send):
        response = JSONResponse(
            {"detail": "Screenshot request body exceeds allowed size"}, status_code=413,
        )
        await response(scope, receive, send)
