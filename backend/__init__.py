"""Backend package bootstrap.

Adds the backend directory to sys.path so absolute imports used across this
codebase (e.g. `from extensions import db`) still resolve when running via:
`gunicorn --bind 127.0.0.1:5000 backend.app:app`.
"""

import os
import sys

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
