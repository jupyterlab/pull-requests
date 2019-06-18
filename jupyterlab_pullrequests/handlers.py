"""
Module with all of the individual handlers, which return the results to the frontend.
"""
import json
from http import HTTPStatus

import tornado.gen as gen
from jupyterlab_pullrequests.base import HTTPError, PullRequestsAPIHandler
from notebook.utils import url_escape, url_path_join
from tornado.httpclient import AsyncHTTPClient, HTTPClientError, HTTPRequest
from tornado.httputil import url_concat
from tornado.web import MissingArgumentError

GITHUB_API_BASE_URL = "https://api.github.com"

# -----------------------------------------------------------------------------
# /pullrequests/prs/user Handler
# -----------------------------------------------------------------------------

class ListPullRequestsGithubUserHandler(PullRequestsAPIHandler):
    """
    Returns array of a Github user's PRs, similar to https://github.com/pulls
    Takes parameter 'filter' with following options
        - 'created' returns all PRs authenticated user has created
        - 'assigned' returns all PRs assigned to authenticated user
    """

    def validate_request(self, pr_filter):
        if not (pr_filter == "created" or pr_filter == "assigned"):
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST, 
                reason=f"Invalid parameter 'filter'. Expected value 'created' or 'assigned', received '{pr_filter}'."
            )

    @gen.coroutine
    def get(self):

        pr_filter = validate_request(self, "filter")
        self.validate_request(pr_filter) # handler specific validation
        
        current_user = yield get_current_user(client=self.client, access_token=self.access_token)
        search_filter = get_search_filter(param_filter=pr_filter, username=current_user)

        prs = yield list_prs(
            client=self.client, access_token=self.access_token, search_filter=search_filter
        )
        self.finish(json.dumps(prs))

@gen.coroutine
def get_current_user(client=None, access_token=None):

    if (not access_token) or (access_token == ""):
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason="No Github access token specified."
        )

    git_url = url_path_join(GITHUB_API_BASE_URL, "/user")
    try:
        data = yield call_github(client, access_token, git_url)
    except HTTPError as e:
        # Custom handling for invalid access token
        if e.status_code == 401:
            raise HTTPError(
                status_code=e.status_code,
                reason="Invalid Github access token specified."
            )
    
    return data["login"]

@gen.coroutine
def list_prs(client=None, access_token=None, search_filter=None):

    # Use search API to find matching PRs and return
    git_url = url_path_join(
        GITHUB_API_BASE_URL, "/search/issues?q=+state:open+type:pr" + search_filter
    )

    data = yield call_github(client, access_token, git_url)
    return data["items"]

def get_search_filter(param_filter=None, username=None):
        
    if param_filter == "created":
        search_filter = "+author:"
    elif param_filter == "assigned":
        search_filter = "+assignee:"

    return search_filter + username

# -----------------------------------------------------------------------------
# /pullrequests/prs/files Handler
# -----------------------------------------------------------------------------

class ListPullRequestsGithubFilesHandler(PullRequestsAPIHandler):
    """
    Returns array of a Github PR's files
    Takes parameter 'id' with the id of the PR
    """

    @gen.coroutine
    def get(self):
        pr_id = validate_request(self, "id")
        files = yield list_files(self.client, self.access_token, pr_id)
        self.finish(json.dumps(files))

@gen.coroutine
def list_files(client=None, access_token=None, pr_id=None):

    git_url = url_path_join(pr_id, "/files")

    data = yield call_github(client, access_token, git_url)
    return data

# -----------------------------------------------------------------------------
# /pullrequests/files/content Handler
# -----------------------------------------------------------------------------

class PullRequestsGithubFileContentHandler(PullRequestsAPIHandler):
    """
    Returns base and head content
    """

    @gen.coroutine
    def get(self):
        pr_id = validate_request(self, "id")
        filename = validate_request(self, "filename")
        content = yield get_pr_filecontent(self.client, self.access_token, pr_id, filename)
        print(content)
        self.finish(json.dumps(content))

@gen.coroutine
def get_pr_links(client=None, access_token=None, pr_id=None, filename=None):

    # Use search API to find matching PRs and return
    git_url = pr_id

    data = yield call_github(client, access_token, git_url)
    base_url = url_concat(data["base"]["repo"]["url"]+"/contents/"+filename, {"ref": data["base"]["ref"]})
    head_url = url_concat(data["head"]["repo"]["url"]+"/contents/"+filename, {"ref": data["head"]["ref"]})
    return {'base_url':base_url, 'head_url':head_url}

@gen.coroutine
def validate_pr_link(client, access_token, link):

    try:
        data = yield call_github(client, access_token, link)
        return data["download_url"]
    except HTTPError as e:
        if e.status_code == 404:
            return ""
        else:
            raise e

@gen.coroutine
def get_file_content(client, access_token, file_url):

    if (file_url == ""):
        return ""
    result = yield call_github(client, access_token, file_url, False)
    return result

@gen.coroutine
def get_pr_filecontent(client=None, access_token=None, pr_id=None, filename=None):

    links = yield get_pr_links(client, access_token, pr_id, filename)

    base_rawurl = yield validate_pr_link(client, access_token, links["base_url"])
    head_rawurl = yield validate_pr_link(client, access_token, links["head_url"])

    base_content = yield get_file_content(client, access_token, base_rawurl)
    head_content = yield get_file_content(client, access_token, head_rawurl)
    
    return {'base_content':base_content, 'head_content':head_content}

# -----------------------------------------------------------------------------
# Handler utilities
# -----------------------------------------------------------------------------

def validate_request(handler, arg):
    try:
        param = handler.get_argument(arg)
        if param is None or param == "":
            raise ValueError()
        return param
    except MissingArgumentError as e:
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason=f"Missing argument '{arg}'."
        )
    except ValueError as e:
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason=f"Invalid argument '{arg}', cannot be blank."
        )

@gen.coroutine
def call_github(client, access_token, git_url, load_json=True):

    params = {"Accept": "application/vnd.github.v3+json", "access_token": access_token}
    url = url_concat(git_url, params)

    # User agents required for Github API, see https://developer.github.com/v3/#user-agent-required
    request = HTTPRequest(
        url, validate_cert=True, user_agent="JupyterLab Pull Requests"
    )

    try:
        response = yield client.fetch(request)
        result = response.body.decode("utf-8")
        if load_json:
            data = json.loads(result)
            return data
        else:
            return result
    except HTTPClientError as e:
        raise HTTPError(
            status_code=e.code,
            reason=f"Invalid response in '{git_url}': '{str(e)}'"
        )
    except ValueError as e:
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason=f"Invalid response in '{git_url}': '{str(e)}'"
        )
    except Exception as e:
        raise HTTPError(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            reason=f"Unknown error in '{git_url}': {str(e)}"
        )

# -----------------------------------------------------------------------------
# URL to handler mappings
# -----------------------------------------------------------------------------

default_handlers = [("/pullrequests/prs/user", ListPullRequestsGithubUserHandler),
                    ("/pullrequests/prs/files", ListPullRequestsGithubFilesHandler),
                    ("/pullrequests/files/content", PullRequestsGithubFileContentHandler)]

def load_jupyter_server_extension(nbapp):
    webapp = nbapp.web_app
    base_url = webapp.settings["base_url"]
    webapp.add_handlers(
        ".*$",
        [(url_path_join(base_url, pat), handler) for pat, handler in default_handlers],
    )
