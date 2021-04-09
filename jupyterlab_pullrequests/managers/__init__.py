from .github_anonymous import AnonymousGithubManager
from .github import GitHubManager
from .gitlab import GitLabManager

# Supported third-party services
MANAGERS = {
    "github-anonymous": AnonymousGithubManager,
    "github": GitHubManager,
    "gitlab": GitLabManager,
}
