"""Vercel entrypoint for CrowdRoute AI FastAPI backend."""

import sys
from pathlib import Path

# Ensure backend root and repo root are in python path
_backend_dir = Path(__file__).resolve().parent
_repo_root = _backend_dir.parent
for _p in [str(_repo_root), str(_backend_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from backend.app.main import app
except ImportError:
    from app.main import app

__all__ = ["app"]
