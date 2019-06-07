"""
Module with all of the individual handlers, which return the results to the frontend.
"""
import json
from http import HTTPStatus

import tornado.gen as gen
from jupyterlab_pullrequests.base import HTTPError, PullRequestsAPIHandler
from notebook.utils import url_escape, url_path_join
from tornado.httpclient import AsyncHTTPClient, HTTPRequest, HTTPClientError
from tornado.httputil import url_concat
from tornado.web import MissingArgumentError

GITHUB_API_BASE_URL = "https://api.github.com"

class ListPullRequestsGithubUserHandler(PullRequestsAPIHandler):
    """
    Returns array of a Github user's PRs, similar to https://github.com/pulls
    Takes parameter 'filter' with following options
        - 'created' returns all PRs authenticated user has created
        - 'assigned' returns all PRs assigned to authenticated user
    """

    # Returns search filter if valid, else throws error
    def validate_request(self):

        # Parse filter parameter into useable link
        try:
            param_filter = self.get_argument("filter")
        except MissingArgumentError as e:
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason="Missing argument 'filter'. Expected 'filter' with value 'created' or 'assigned'."
            )

        if not (param_filter == "created" or param_filter == "assigned"):
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST, 
                reason=f"Invalid parameter 'filter'. Expected value 'created' or 'assigned', received '{param_filter}'."
            )

    @gen.coroutine
    def get(self):

        # Ensure the user has an access token
        self.validate_request()
        current_user = yield get_current_user(client=self.client, access_token=self.access_token)
        param_filter = self.get_argument("filter")
        search_filter = get_search_filter(param_filter=param_filter, username=current_user)

        prs = yield list_prs(
            client=self.client, access_token=self.access_token, search_filter=search_filter
        )
        self.finish(json.dumps(prs))

class ListPullRequestsGithubFilesHandler(PullRequestsAPIHandler):
    """
    Returns array of a Github PR's files
    Takes parameter 'id' with the id of the PR
    """

    def validate_request(self):
        try:
            pr_id = self.get_argument("id")
        except MissingArgumentError as e:
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason="Missing argument 'id'. Expected 'id' with id of PR."
            )

    @gen.coroutine
    def get(self):
        self.validate_request()
        pr_id = self.get_argument("id")
        files = yield list_files(self.client, self.access_token, pr_id)
        self.finish(json.dumps(files))

# -----------------------------------------------------------------------------
# Handler utilities
# -----------------------------------------------------------------------------


@gen.coroutine
def get_current_user(client=None, access_token=None):

    if (not access_token) or (access_token == ""):
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason="No Github access token specified."
        )

    # Get the username of the authenticated user
    api_path = url_path_join(GITHUB_API_BASE_URL, url_escape("/user"))
    params = {"Accept": "application/vnd.github.v3+json", "access_token": access_token}
    url = url_concat(api_path, params)
    # User agents required for Github API, see https://developer.github.com/v3/#user-agent-required
    request = HTTPRequest(
        url, validate_cert=True, user_agent="JupyterLab Pull Requests"
    )
    try:
        response = yield client.fetch(request)
        data = json.loads(response.body.decode("utf-8"))
        return data["login"]
    except HTTPClientError as e:
        raise HTTPError(
            status_code=e.code,
            reason=f"Invalid Github access token specified: '{str(e)}''"
        )
    except Exception as e:
        raise HTTPError(
            status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            reason=f"Get current user error: '{str(e)}''"
        )

@gen.coroutine
def list_prs(client=None, access_token=None, search_filter=None):

    # Use search API to find matching PRs and return
    api_path = url_path_join(
        GITHUB_API_BASE_URL, "/search/issues?q=+state:open+type:pr" + search_filter
    )
    params = {
        "Accept": "application/vnd.github.v3+json",
        "access_token": access_token,
    }
    url = url_concat(api_path, params)
    request = HTTPRequest(
        url, validate_cert=True, user_agent="JupyterLab Pull Requests"
    )
    try:
        response = yield client.fetch(request)
        data = json.loads(response.body.decode("utf-8"))
        return data["items"]
    except HTTPClientError as e:
        raise HTTPError(
            status_code=e.code,
            reason=f"Received error from Github /search: '{str(e)}'"
        )
    except Exception as e:
        raise HTTPError(
            status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            reason=f"List PRs error: '{str(e)}''"
        )

def get_search_filter(param_filter=None, username=None):
        
        if param_filter == "created":
            search_filter = "+author:"
        elif param_filter == "assigned":
            search_filter = "+assignee:"

        return search_filter + username

@gen.coroutine
def list_files(client=None, access_token=None, pr_id=None):

    # Use search API to find matching PRs and return
    api_path = url_path_join(
        pr_id, "/files"
    )
    params = {
        "Accept": "application/vnd.github.v3+json",
        "access_token": access_token,
    }
    url = url_concat(api_path, params)
    request = HTTPRequest(
        url, validate_cert=True, user_agent="JupyterLab Pull Requests"
    )
    try:
        response = yield client.fetch(request)
        return json.loads(response.body.decode("utf-8"))
    except HTTPClientError as e:
        raise HTTPError(
            status_code=e.code,
            reason=f"Invalid parameter 'id': '{str(e)}'"
        )
    except ValueError as e:
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason=f"Invalid parameter 'id': '{str(e)}'"
        )
    except Exception as e:
        raise HTTPError(
            status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            reason=f"List files error: '{str(e)}''"
        )

# -----------------------------------------------------------------------------
# URL to handler mappings
# -----------------------------------------------------------------------------

default_handlers = [("/pullrequests/prs/user", ListPullRequestsGithubUserHandler),
                    ("/pullrequests/prs/files", ListPullRequestsGithubFilesHandler)]

def load_jupyter_server_extension(nbapp):
    webapp = nbapp.web_app
    base_url = webapp.settings["base_url"]
    webapp.add_handlers(
        ".*$",
        [(url_path_join(base_url, pat), handler) for pat, handler in default_handlers],
    )
