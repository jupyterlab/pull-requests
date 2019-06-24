"""
Module with all of the individual handlers, which return the results to the frontend.
"""
import json
from http import HTTPStatus

import tornado.gen as gen
from jupyterlab_pullrequests.base import PullRequestsAPIHandler
from notebook.utils import url_path_join
from tornado.web import HTTPError, MissingArgumentError

# -----------------------------------------------------------------------------
# /pullrequests/prs/user Handler
# -----------------------------------------------------------------------------

class ListPullRequestsUserHandler(PullRequestsAPIHandler):
    """
    Returns array of a user's PRs
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
        
        current_user = yield self.manager.get_current_user()
        prs = yield self.manager.list_prs(current_user['username'], pr_filter)
        self.finish(json.dumps(prs))

# -----------------------------------------------------------------------------
# /pullrequests/prs/files Handler
# -----------------------------------------------------------------------------

class ListPullRequestsFilesHandler(PullRequestsAPIHandler):
    """
    Returns array of a PR's files
    Takes parameter 'id' with the id of the PR
    """

    @gen.coroutine
    def get(self):
        pr_id = validate_request(self, "id")
        files = yield self.manager.list_files(pr_id)
        self.finish(json.dumps(files))

# -----------------------------------------------------------------------------
# /pullrequests/files/content Handler
# -----------------------------------------------------------------------------

class PullRequestsFileContentHandler(PullRequestsAPIHandler):
    """
    Returns base and head content
    """

    @gen.coroutine
    def get(self):
        pr_id = validate_request(self, "id")
        filename = validate_request(self, "filename")
        content = yield self.manager.get_pr_content(pr_id, filename)
        self.finish(json.dumps(content))

# -----------------------------------------------------------------------------
# Handler utilities
# -----------------------------------------------------------------------------

def validate_request(handler, arg):
    try:
        param = handler.get_argument(arg)
        if not param:
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

# -----------------------------------------------------------------------------
# URL to handler mappings
# -----------------------------------------------------------------------------

default_handlers = [("/pullrequests/prs/user", ListPullRequestsUserHandler),
                    ("/pullrequests/prs/files", ListPullRequestsFilesHandler),
                    ("/pullrequests/files/content", PullRequestsFileContentHandler)]

def load_jupyter_server_extension(nbapp):
    webapp = nbapp.web_app
    base_url = webapp.settings["base_url"]
    webapp.add_handlers(
        ".*$",
        [(url_path_join(base_url, pat), handler) for pat, handler in default_handlers],
    )
