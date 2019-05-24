"""
Basic Setup Module
"""
from setuptools import setup

setup_args = dict(
    name="jupyterlab_pullrequests",
    version="0.0.1",
    author="Amazon",
    description="Amazon Software License",
    packages=["jupyterlab_pullrequests"],
    install_requires=["notebook"],
    package_data={"jupyterlab_pullrequests": ["*"]},
)

if __name__ == "__main__":
    setup(**setup_args)
