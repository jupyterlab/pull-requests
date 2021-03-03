from .github import GitHubManager
from .gitlab import GitLabManager

# Supported third-party services
MANAGERS = {"github": GitHubManager, "gitlab": GitLabManager}
