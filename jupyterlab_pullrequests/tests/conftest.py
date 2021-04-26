import pytest
from traitlets.config import Config


pytest_plugins = ["jupyter_server.pytest_plugin"]


@pytest.fixture
def jp_server_config(jp_server_config):
    return {
        "ServerApp": {"jpserver_extensions": {"jupyterlab_pullrequests": True}},
        "PRConfig": {"api_base_url": "https://api.github.com", "access_token": "valid"},
    }


@pytest.fixture
def pr_base_config():
    return Config()


@pytest.fixture
def pr_github_config(pr_base_config):
    return pr_base_config()


@pytest.fixture
def pr_github_manager(pr_base_config):
    from ..managers.github import GitHubManager

    return GitHubManager(pr_base_config)


@pytest.fixture
def pr_valid_github_manager(pr_github_manager):
    pr_github_manager._config.access_token = "valid"
    return pr_github_manager


@pytest.fixture
def pr_gitlab_manger(pr_base_config):
    from ..managers.gitlab import GitLabManager

    return GitLabManager(pr_base_config)


@pytest.fixture
def pr_valid_gitlab_manager(pr_gitlab_manger):
    pr_gitlab_manger._config.access_token = "valid"
    return pr_gitlab_manger
