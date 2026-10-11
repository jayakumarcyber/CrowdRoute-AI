"""Vercel entrypoint for CrowdRoute AI FastAPI backend.

Exposes the existing FastAPI application as a module-level variable named `app`
for the Vercel Python runtime when running with service root `backend` and
entrypoint `main:app`.
"""

import sys
import types
from pathlib import Path

# Ensure backend directory is first in sys.path
_backend_dir = Path(__file__).resolve().parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

# Also include repo root in sys.path if it exists locally
_repo_root = _backend_dir.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

# Bridge 'backend' package in sys.modules so that any internal module
# importing 'from backend.app...' resolves correctly even when Vercel deploys
# with service root 'backend'.
if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(_backend_dir)]
    sys.modules["backend"] = backend_pkg

# Import existing FastAPI application instance from app.main
try:
    from app.main import app
except ImportError:
    from backend.app.main import app

__all__ = ["app"]
