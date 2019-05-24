"""
Module with all of the individual handlers, which return the results to the frontend.
"""
import json
from http import HTTPStatus

import tornado.gen as gen
from jupyterlab_pullrequests.base import HTTPError, PullRequestsAPIHandler
from notebook.utils import url_escape, url_path_join
from tornado.httpclient import AsyncHTTPClient, HTTPRequest
from tornado.httputil import url_concat
from tornado.web import MissingArgumentError
from traitlets import Bool, Unicode
from traitlets.config import Configurable

GITHUB_API_BASE_URL = "https://api.github.com"


class GitHubConfig(Configurable):
    """
    Allows configuration of Github Personal Access Tokens via jupyter_notebook_config.py
    """

    access_token = Unicode(
        "", config=True, help=("A personal access token for GitHub.")
    )


class ListPullRequestsGithubUserHandler(PullRequestsAPIHandler):
    """
    Returns array of a Github user's PRs, similar to https://github.com/pulls
    Takes parameter 'filter' with following options
        - 'created' returns all PRs authenticated user has created
        - 'assigned' returns all PRs assigned to authenticated user
    """

    def get_access_token(self):
        c = GitHubConfig(config=self.config)
        return c.access_token

    # Returns search filter if valid, else throws error
    def validate_request(self):

        # Parse filter parameter into useable link
        try:
            param_filter = self.get_argument("filter")
        except MissingArgumentError as e:
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason="Missing argument 'filter'. Expected 'filter' with value 'created' or 'assigned'.",
                error_code=400
            )

        if not (param_filter == "created" or param_filter == "assigned"):
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST, 
                reason=f"Invalid parameter 'filter'. Expected value 'created' or 'assigned', received '{param_filter}'.", 
                error_code=400
            )

    @gen.coroutine
    def list_prs(self, access_token=None, current_user=None):

        param_filter = self.get_argument("filter")
        if param_filter == "created":
            search_filter = "+author:"
        elif param_filter == "assigned":
            search_filter = "+assignee:"

        search_filter += current_user

        # Use search API to find matching PRs and return
        api_path = url_path_join(
            GITHUB_API_BASE_URL, "/search/issues?q=+state:open+type:pr" + search_filter
        )
        params = {
            "Accept": "application/vnd.github.v3+json",
            "access_token": access_token,
        }
        url = url_concat(api_path, params)
        client = AsyncHTTPClient()
        request = HTTPRequest(
            url, validate_cert=True, user_agent="JupyterLab Pull Requests"
        )
        try:
            response = yield client.fetch(request)
        except Exception as e:
            raise HTTPError(
                status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                reason=f"Received error from Github /search: '{str(e)}'",
                error_code=503
            )
        
        data = json.loads(response.body.decode("utf-8"))

        # TODO pagination
        if "items" in data and data["items"] is not None:
            return data["items"]
        else:
            raise HTTPError(
                status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                reason="Received malformed Github response, please contact the developer.",
                error_code=503
            )

    @gen.coroutine
    def get(self):

        # Ensure the user has an access token
        self.validate_request()
        access_token = self.get_access_token()
        current_user = yield get_current_user(access_token=access_token)

        prs = yield self.list_prs(
            access_token=access_token, current_user=current_user
        )
        self.finish(json.dumps(prs))


# -----------------------------------------------------------------------------
# Handler utilities
# -----------------------------------------------------------------------------


@gen.coroutine
def get_current_user(access_token=None):

    if (not access_token) or (access_token == ""):
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason="No Github access token specified.",
            error_code=400
        )

    # Get the username of the authenticated user
    api_path = url_path_join(GITHUB_API_BASE_URL, url_escape("/user"))
    params = {"Accept": "application/vnd.github.v3+json", "access_token": access_token}
    url = url_concat(api_path, params)
    client = AsyncHTTPClient()
    # User agents required for Github API, see https://developer.github.com/v3/#user-agent-required
    request = HTTPRequest(
        url, validate_cert=True, user_agent="JupyterLab Pull Requests"
    )
    try:
        response = yield client.fetch(request)
    except Exception as e:
        raise HTTPError(
            status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            reason=f"Received error from Github /user: '{str(e)}'",
            error_code=503
        )
    data = json.loads(response.body.decode("utf-8"))

    # Make sure Github response is properly formatted, otherwise throw error
    if "login" in data:
        return data["login"]
    else:
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason="Invalid Github access token specified.",
            error_code=400
        )


# -----------------------------------------------------------------------------
# URL to handler mappings
# -----------------------------------------------------------------------------

default_handlers = [("/pullrequests/prs/user", ListPullRequestsGithubUserHandler)]


def load_jupyter_server_extension(nbapp):
    webapp = nbapp.web_app
    base_url = webapp.settings["base_url"]
    webapp.add_handlers(
        ".*$",
        [(url_path_join(base_url, pat), handler) for pat, handler in default_handlers],
    )
