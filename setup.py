"""
Basic Setup Module
"""
import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

tests_require = ["pytest", "asynctest"]

setup_args = dict(
    name="jupyterlab_pullrequests",
    version="0.3.0",
    author="Jupyter Development Team",
    license="BSD-3-Clause",
    description="A server extension for JupyterLab's pull request extension",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=setuptools.find_packages(),
    install_requires=["notebook", "nbdime"],
    tests_require=tests_require,
    extras_require={'test': tests_require},
    package_data={"jupyterlab_pullrequests": ["*"]},
)

if __name__ == "__main__":
    setuptools.setup(**setup_args)
