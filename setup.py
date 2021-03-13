"""
jupyterlab_pullrequests setup

See ``setup.cfg`` and ``package.json`` for the rest of the packaging metadata
"""
import sys
import json
import pprint
from pathlib import Path

HERE = Path(__file__).parent.resolve()

# The name of the project
NAME = "jupyterlab_pullrequests"

LAB_PATH = HERE / NAME / "labextension"

__js__ = json.loads((LAB_PATH / "package.json").read_text())
__version__ = __js__["version"]

APPS = ["server", "notebook"]
ETC = "etc/jupyter"
SHARE = "share/jupyter"
EXT = f"{SHARE}/labextensions/{__js__['name']}"

DATA_FILES = []

# add the serverextension config files
DATA_FILES += [
    (f"{ETC}/jupyter_{app}_config.d", [f"jupyter-config/{NAME}_{app}.json"])
    for app in APPS
]

# add the labextension install.json metadata
DATA_FILES += [(EXT, ["install.json"])]

# add the actual labextension assets
DATA_FILES += [
    (
        EXT
        if p.parent == LAB_PATH
        else f"""{EXT}/{p.parent.relative_to(LAB_PATH).as_posix()}""",
        [f"{NAME}/labextension/{p.relative_to(LAB_PATH).as_posix()}"],
    )
    for p in LAB_PATH.rglob("*")
    if not p.is_dir()
]

REMOTES = [
    p[1][0] for p in DATA_FILES if "remoteEntry" in p[1][0] and p[1][0].endswith(".js")
]
REMOTE_MAP = [
    p[1][0] for p in DATA_FILES if "remoteEntry" in p[1][0] and p[1][0].endswith(".map")
]

if len(REMOTES) > 1 or len(REMOTE_MAP) > 1:
    print(
        f"""
    Expected exacly 1 remoteEntry*.js, found {len(REMOTES)}:

    {pprint.pformat(REMOTES)}

    Expected at most one remoteEntry*.js.map, found {len(REMOTE_MAP)}:

    {pprint.pformat(REMOTE_MAP)}

    Please run:

        jlpm clean
        jlpm build:prod"""
    )
    sys.exit(1)

SETUP_ARGS = dict(
    name=NAME,
    version=__js__["version"],
    url=__js__["homepage"],
    project_urls={
        "Bug Tracker": f"{__js__['homepage']}/issues",
        "CI": f"{__js__['homepage']}/actions",
        "Releases": f"{__js__['homepage']}/releases",
        "Source Code": f"{__js__['homepage']}",
    },
    author=__js__["author"]["name"],
    description=__js__["description"],
    license=__js__["license"],
    data_files=DATA_FILES,
)

if __name__ == "__main__":
    import setuptools

    setuptools.setup(**SETUP_ARGS)
