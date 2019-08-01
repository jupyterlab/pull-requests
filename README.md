# jupyterlab-pullrequests

A JupyterLab extension for viewing and commenting on pull requests

## Installation

### 1. See development install directions below

### 2. Getting your access token from GitHub

You can get an access token by following these steps:

1.  [Verify](https://help.github.com/articles/verifying-your-email-address) your email address with GitHub.
1.  Go to your account settings on GitHub and select "Developer Settings" from the left panel.
1.  On the left, select "Personal access tokens"
1.  Click the "Generate new token" button, and enter your password.
1.  Give the token a description, and check the "**repo**" scope box.
1.  Click "Generate token"
1.  You should be given a string which will be your access token.

Remember that this token is effectively a password for your GitHub account.
_Do not_ share it online or check the token into version control,
as people can use it to access all of your data on GitHub.

### 3. Setting your access token in JupyterLab Pull Requests

You now need to add the credentials you got from GitHub
to your notebook configuration file. Instructions for generating a configuration
file can be found [here](http://jupyter-notebook.readthedocs.io/en/stable/config_overview.html#configure-nbserver).
Once you have identified this file, add the following lines to it:

```python
c.GitHubConfig.access_token = '<YOUR_ACCESS_TOKEN>'
```

where "`<YOUR_ACCESS_TOKEN>`" is the string value you obtained above.

Congrats, you did it! Launch JupyterLab and look for the Pull Request tab on the left! 🎉


## Development

For a development install, do the following in the repository directory:

```bash
# Install dependencies
jlpm install
# Build Typescript source
jlpm run build
# Link your development version of the extension with JupyterLab
jupyter labextension link .
# Rebuild Typescript source after making changes
jlpm run build
```

```bash
pip install .
jupyter serverextension enable --py jupyterlab_pullrequests
```

To rebuild the package and the JupyterLab app:

```bash
jlpm run build
jupyter lab build
```

## Known Issues

This version (pre JupyterLab 1.0) of the extension requires a local depedency of `jupyterlab-git` because the networked version is blocked on [this](https://github.com/jupyterlab/jupyterlab-git/pull/384).

Relative local dependencies sometimes fail with the following error during JupyterLab webpack (see [here](https://github.com/jupyterlab/jupyterlab/issues/4599)).

```
Tarball is not in network and can not be located in cache (["../yarn/v2/.tmp/12c686dd13cb1ef64cebbd243df0a44d/jupyterlab-git.tgz","../yarn/v2/.tmp/064d18f9871b47b33e275a17ec9ead49/.yarn-tarball.tgz"])
```

To fix, simply update the local dependency from a relative path to an absolute path.

Go to `package.json` and replace the dependency

```json
"@jupyterlab/git": "file:./jupyterlab-git.tgz",
```

with

```json
"@jupyterlab/git": "file:/absolute/path/to/jupyterlab-git.tgz",
```

That's it! Now rebuild your project with the following and you're good to go.

```
rm -rf node_modules
jlpm cache clean
jlpm install
jlpm run build
jupyter lab build
```