from .github import PullRequestsGithubManager
from .gitlab import PullRequestsGitLabManager

MANAGERS = {"github": PullRequestsGithubManager, "gitlab": PullRequestsGitLabManager}
