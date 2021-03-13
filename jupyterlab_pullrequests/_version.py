""" read single source of truth from shipped labextension's package.json
"""
import json
from pathlib import Path

__js__ = json.loads((Path(__file__).parent / "labextension/package.json").read_text())
__version__ = __js__["version"]
