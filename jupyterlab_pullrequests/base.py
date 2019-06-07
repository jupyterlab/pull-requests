import json
import traceback

import tornado.gen as gen
from notebook.base.handlers import APIHandler
from tornado import web
from tornado.httpclient import AsyncHTTPClient
from traitlets import Bool, Unicode
from traitlets.config import Configurable


class GitHubConfig(Configurable):
    """
    Allows configuration of Github Personal Access Tokens via jupyter_notebook_config.py
    """

    access_token = Unicode(
        "", config=True, help=("A personal access token for GitHub.")
    )

class PullRequestsAPIHandler(APIHandler):
    """
    Base handler for PullRequest specific API handlers
    This abstracts common functionality expected to be required by all handlers
    From https://code.amazon.com/packages/MeadNotebookInstanceAgent/blobs/mainline/--/src/sagemaker_nbi_agent/base.py

    1) Extracting request from the JSON request body
    2) Returning JSON response
    3) Handling intentional errors thrown by handlers and adding error to JSON response body
    4) Handling unintentional errors thrown by handlers and returning 500 with the details of the error
    5) Providing abstraction to add request validation before beginning processing
    """

    def initialize(self):
        self.client = AsyncHTTPClient()
        self.access_token = self.get_access_token()

    def get_access_token(self):
        c = GitHubConfig(config=self.config)
        return c.access_token

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


class HTTPError(web.HTTPError):
    def __init__(
        self, status_code=500, log_message=None, error_code=None, *args, **kwargs
    ):
        """
        Wrapper over the Tornado web.HTTPError for adding support for error_codes
        :param status_code: the HTTP status code
        :param log_message:t
        :param error_code:
        :param args:
        :param kwargs:
        """
        super().__init__(status_code, log_message, *args, **kwargs)
        self.error_code = error_code
