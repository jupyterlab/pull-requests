"""
Setup Module to setup Python Handlers for the jupyterlab_pullrequests extension.
"""
import os

import setuptools
from jupyter_packaging import (
    combine_commands,
    create_cmdclass,
    ensure_targets,
    get_version,
    install_npm,
)

HERE = os.path.abspath(os.path.dirname(__file__))

# The name of the project
name = "jupyterlab_pullrequests"

# Get our version
version = get_version(os.path.join(name, "_version.py"))

lab_path = os.path.join(HERE, name, "labextension")

# Representative files that should exist after a successful build
jstargets = [
    os.path.join(HERE, "lib", "models.js"),
]

package_data_spec = {name: ["*"]}

data_files_spec = [
    ("share/jupyter/lab/extensions", lab_path, "*.tgz"),
    (
        "etc/jupyter/jupyter_notebook_config.d",
        "jupyter-config",
        "jupyterlab_pullrequests.json",
    ),
]

cmdclass = create_cmdclass(
    "jsdeps", package_data_spec=package_data_spec, data_files_spec=data_files_spec
)

cmdclass["jsdeps"] = combine_commands(
    install_npm(HERE, build_cmd="build:all", npm=["jlpm"]),
    ensure_targets(jstargets),
)

with open("README.md", "r") as fh:
    long_description = fh.read()

tests_require = ["pytest", "asynctest"]

setup_args = dict(
    name=name,
    version=version,
    url="https://github.com/jupyterlab/pull-requests",
    author="Jupyter Development Team",
    description="Pull Requests for JupyterLab",
    long_description=long_description,
    long_description_content_type="text/markdown",
    cmdclass=cmdclass,
    packages=setuptools.find_packages(),
    install_requires=["dataclasses;python_version<'3.7'", "jupyterlab~=2.0", "nbdime"],
    python_requires=">=3.6",
    tests_require=tests_require,
    extras_require={"test": tests_require},
    zip_safe=False,
    include_package_data=True,
    license="BSD-3-Clause",
    platforms="Linux, Mac OS X, Windows",
    keywords=["Jupyter", "JupyterLab"],
    classifiers=[
        "License :: OSI Approved :: BSD License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Framework :: Jupyter",
    ],
)


if __name__ == "__main__":
    setuptools.setup(**setup_args)
