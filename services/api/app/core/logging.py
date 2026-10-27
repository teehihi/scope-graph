import logging
import re
import sys

# Redact potential keys and tokens
SECRET_PATTERNS = [
    re.compile(r'(?i)(api[_-]?key|secret|token|password|auth|authorization)["\']?\s*[:=]\s*["\']?([^"\'\s,;]+)'),
    re.compile(r'Bearer\s+([a-zA-Z0-9_\-\.]{15,})'),
]

class RedactingFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        for pattern in SECRET_PATTERNS:
            msg = pattern.sub(r'\1: [REDACTED]', msg)
        return msg

def setup_logging(log_level: str = "INFO"):
    handler = logging.StreamHandler(sys.stdout)
    formatter = RedactingFormatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(log_level.upper())
    # Replace existing handlers
    root.handlers = [handler]

    return logging.getLogger("scopegraph")
