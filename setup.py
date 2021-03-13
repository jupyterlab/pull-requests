"""
Setup Module to setup Python Handlers for the jupyterlab_pullrequests extension.

See ``setup.cfg`` for the rest of the packaging metadata
"""
from pathlib import Path
import setuptools

NAME = "jupyterlab_pullrequests"
EXT = Path(__file__).parent / f"{NAME}/labextension"
TGZ = [*EXT.glob("*.tgz")]

assert len(TGZ) == 1, f"expected 1, found {len(TGZ)} *.tgz files in {EXT}"

if __name__ == "__main__":
    setuptools.setup(
        data_files=[
            ("share/jupyter/lab/extensions", [f"{NAME}/labextension/{TGZ[0].name}"]),
            ("etc/jupyter/jupyter_notebook_config.d", [f"jupyter-config/{NAME}.json"])
        ]
    )
