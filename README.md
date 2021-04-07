# jupyterlab-pullrequests

[![Build Status](https://github.com/jupyterlab/pull-requests/actions/workflows/build.yml/badge.svg)](https://github.com/jupyterlab/pull-requests/actions/workflows/build.yml)
[![NPM Version](https://img.shields.io/npm/v/@jupyterlab/pullrequests.svg)](https://www.npmjs.com/package/@jupyterlab/pullrequests)
[![Pypi Version](https://img.shields.io/pypi/v/jupyterlab-pullrequests.svg)](https://pypi.org/project/jupyterlab-pullrequests/)
[![Conda Version](https://img.shields.io/conda/vn/conda-forge/jupyterlab-pullrequests.svg)](https://anaconda.org/conda-forge/jupyterlab-pullrequests)

A JupyterLab extension for reviewing pull requests.

![demo](https://raw.githubusercontent.com/jupyterlab/pull-requests/master/gifs/demo.gif)

For now, it supports GitHub and GitLab providers.

## Prerequisites

- JupyterLab 3.x
  - for JupyterLab 2.x, see the [`2.x` branch](https://github.com/jupyterlab/pull-requests/tree/2.x) 
- [jupyterlab-git](https://github.com/jupyterlab/jupyterlab-git) >=0.30.0

> For GitLab, you will need also `diff-match-patch`

## Usage

-   Open the pull request extension from the tab on the left panel

## Installation

### 1. Install the extension with the following steps

With pip:

```bash
pip install jupyterlab-pullrequests
```

Or with conda:

```bash
conda install -c conda-forge jupyterlab-pullrequests
```


For GitLab, in addition, you will need to

```bash
pip install diff-match-patch
```
Or with conda:

```bash
conda install -c conda-forge diff-match-patch
```

### 2. Getting your access token

For GitHub, the documentation is [there](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token). The token scope must be **repo**.

For GitLab, the documentation is [there](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html#creating-a-personal-access-token). The token scope must be **api**.

Remember that this token is effectively a password for your account.
_Do not_ share it online or check the token into version control,
as people can use it to access all of your data.

### 3. Setting your access token in JupyterLab Pull Requests

You now need to add the credentials you got from the provider
to your server configuration file. Instructions for generating a configuration
file can be found [here](http://jupyter-notebook.readthedocs.io/en/stable/config_overview.html#configure-nbserver).
Once you have identified this file, add the following lines to it:

```python
c.PRConfig.access_token = '<YOUR_ACCESS_TOKEN>'
```

where "`<YOUR_ACCESS_TOKEN>`" is the string value you obtained above.

If you are using GitLab instead of GitHub, you also need to set the
provider:

```python
c.PRConfig.provider = 'gitlab'
```

Congrats, you did it! Launch JupyterLab and look for the Pull Request tab on the left! 🎉

> If you are not using GitHub.com or GitLab.com, you can set the API base URL of your provider
> with the configurable parameter `PRConfig.api_base_url`.

## Settings

This extension as [server settings](http://jupyter-notebook.readthedocs.io/en/stable/config_overview.html).

-   **PRConfig.access_token**: Access token to be authenticated by the provider
-   **PRConfig.provider**: `github` (default) or `gitlab`
-   **PRConfig.api_base_url**: Provider API base url (default to `https://api.github.com` except if provider is _gitlab_ then it defaults to `https://gitlab.com/api/v4/`)

## Troubleshooting

- If you are seeing the following error `[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: self signed certificate in certificate chain` and the certificates are installed on your machine, you will need to set the `SSL_CERT_FILE` environment variable to point to your system certificates bundle. For example:

```
export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
```

## Development

### Contributing

If you would like to contribute to the project, please read our [contributor documentation](https://github.com/jupyterlab/pull-requests/blob/master/CONTRIBUTING.md).

JupyterLab follows the official [Jupyter Code of Conduct](https://github.com/jupyter/governance/blob/master/conduct/code_of_conduct.md).
