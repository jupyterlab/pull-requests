"""
Basic Setup Module
"""
import setuptools

tests_require = ["pytest", "asynctest"]

setup_args = dict(
    name="jupyterlab_pullrequests",
    version="0.2.0",
    description="A server extension for JupyterLab's pull request extension",
    packages=setuptools.find_packages(),
    install_requires=["notebook", "nbdime"],
    tests_require=tests_require,
    extras_require={'test': tests_require},
    package_data={"jupyterlab_pullrequests": ["*"]},
)

if __name__ == "__main__":
    setuptools.setup(**setup_args)
