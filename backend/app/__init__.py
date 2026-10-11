"""CrowdRoute AI - Backend Package
Festival Crowd Prediction and Fixed-Fleet Bus Optimization
"""

__version__ = "1.0.0"

import sys as _sys

_app_mod = _sys.modules.get(__name__)
if _app_mod:
    _sys.modules.setdefault("app", _app_mod)
    _sys.modules.setdefault("backend.app", _app_mod)
