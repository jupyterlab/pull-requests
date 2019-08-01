import json
import traceback

import tornado.gen as gen
from jupyterlab_pullrequests.github_manager import PullRequestsGithubManager
from notebook.base.handlers import APIHandler
from tornado import web
from tornado.httpclient import AsyncHTTPClient
from traitlets import Bool, Unicode
from traitlets.config import Configurable


class GitHubConfig(Configurable):
    """
    Allows configuration of Github Personal Access Tokens via jupyter_notebook_config.py
    """

    github_access_token = Unicode(
        "", config=True, help=("A personal access token for GitHub.")
    )

    platform = Unicode(
        "github", config=True, help=("The source control platform. options=[github, codecommit]")
    )

class PullRequestsAPIHandler(APIHandler):
    """
    Base handler for PullRequest specific API handlers
    """

    def initialize(self):
        self.manager = self.get_manager()

    # Defaults to github
    def get_manager(self):
        c = GitHubConfig(config=self.config)
        p = c.platform
        if p.lower() == "github":
            return PullRequestsGithubManager(c.github_access_token)
        elif p.lower() == "codecommit":
            raise NotImplementedError()
        else:
            return PullRequestsGithubManager(c.github_access_token)

    def write_error(self, status_code, **kwargs):
        """
        Override Tornado's RequestHandler.write_error for customized error handlings
        This method will be called when an exception is raised from a handler
        """
        self.set_header("Content-Type", "application/json")
        reply = {"error": "Unhandled error"}
        exc_info = kwargs.get("exc_info")
        if exc_info:
            e = exc_info[1]
            if isinstance(e, web.HTTPError):
                reply["error"] = e.reason
                if hasattr(e, "error_code"):
                    reply["error_code"] = e.error_code
            else:
                reply["error"] = "".join(traceback.format_exception(*exc_info))
        self.finish(json.dumps(reply))
