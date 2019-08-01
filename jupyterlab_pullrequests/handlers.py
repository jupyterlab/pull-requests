"""
Module with all of the individual handlers, which return the results to the frontend.
"""
import json
from collections import namedtuple
from http import HTTPStatus

import tornado.escape as escape
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

        pr_filter = get_request_attr_value(self, "filter")
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
        pr_id = get_request_attr_value(self, "id")
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
        pr_id = get_request_attr_value(self, "id")
        filename = get_request_attr_value(self, "filename")
        content = yield self.manager.get_file_content(pr_id, filename)
        self.finish(json.dumps(content))

# -----------------------------------------------------------------------------
# /pullrequests/files/comments Handler
# -----------------------------------------------------------------------------

class PullRequestsFileCommentsHandler(PullRequestsAPIHandler):
    """
    Returns file comments
    """

    @gen.coroutine
    def get(self):
        pr_id = get_request_attr_value(self, "id")
        filename = get_request_attr_value(self, "filename")
        content = yield self.manager.get_file_comments(pr_id, filename)
        self.finish(json.dumps(content))

    @gen.coroutine
    def post(self):
        pr_id = get_request_attr_value(self, "id")
        filename = get_request_attr_value(self, "filename")
        data = get_body_value(self)
        try:
            if 'in_reply_to' in data:
                PRCommentReply = namedtuple("PRCommentReply", ["text", "in_reply_to"])
                body = PRCommentReply(data["text"], data["in_reply_to"])
            else:
                PRCommentNew = namedtuple("PRCommentNew", ["text", "commit_id", "filename", "position"])
                body = PRCommentNew(data["text"], data["commit_id"], data["filename"], data["position"])
        except KeyError as e:
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason=f"Missing POST key: {e}"
            )
        result = yield self.manager.post_file_comment(pr_id, filename, body)
        self.finish(json.dumps(result))

class PullRequestsFileNBDiffHandler(PullRequestsAPIHandler):
    """
    Returns nbdime diff of given ipynb base content and remote content
    """

    @gen.coroutine
    def post(self):
        data = get_body_value(self)
        try:
            prev_content = data["prev_content"]
            curr_content = data["curr_content"]
        except KeyError as e:
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason=f"Missing POST key: {e}"
            )
        try:
            content = yield self.manager.get_file_nbdiff(prev_content, curr_content)
        except Exception as e:
            raise HTTPError(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR, 
                reason=f"Error diffing content: {e}."
            )
        self.finish(json.dumps(content))


# -----------------------------------------------------------------------------
# Handler utilities
# -----------------------------------------------------------------------------

def get_request_attr_value(handler, arg):
    try:
        param = handler.get_argument(arg)
        if not param:
            raise ValueError()
        return param
    except MissingArgumentError:
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason=f"Missing argument '{arg}'."
        )
    except ValueError:
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason=f"Invalid argument '{arg}', cannot be blank."
        )

def get_body_value(handler):
    try:
        if not handler.request.body:
            raise ValueError()
        return escape.json_decode(handler.request.body)
    except ValueError as e:
        raise HTTPError(
            status_code=HTTPStatus.BAD_REQUEST,
            reason=f"Invalid POST body: {e}"
        )

# -----------------------------------------------------------------------------
# URL to handler mappings
# -----------------------------------------------------------------------------

default_handlers = [("/pullrequests/prs/user", ListPullRequestsUserHandler),
                    ("/pullrequests/prs/files", ListPullRequestsFilesHandler),
                    ("/pullrequests/files/content", PullRequestsFileContentHandler),
                    ("/pullrequests/files/comments", PullRequestsFileCommentsHandler),
                    ("/pullrequests/files/nbdiff", PullRequestsFileNBDiffHandler)]

def load_jupyter_server_extension(nbapp):
    webapp = nbapp.web_app
    base_url = webapp.settings["base_url"]
    webapp.add_handlers(
        ".*$",
        [(url_path_join(base_url, pat), handler) for pat, handler in default_handlers],
    )
