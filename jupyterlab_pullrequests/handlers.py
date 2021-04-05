"""
Module with all of the individual handlers, which return the results to the frontend.
"""
import json
import logging
import traceback
from http import HTTPStatus

import tornado
import tornado.escape as escape
from notebook.base.handlers import APIHandler
from notebook.utils import url_path_join

from .base import CommentReply, NewComment, PRConfig
from .log import get_logger
from .managers import MANAGERS
from .managers.manager import PullRequestsManager

NAMESPACE = "pullrequests"

# -----------------------------------------------------------------------------
# /pullrequests/prs/user Handler
# -----------------------------------------------------------------------------


class PullRequestsAPIHandler(APIHandler):
    """
    Base handler for PullRequest specific API handlers
    """

    def initialize(self, manager: PullRequestsManager, logger: logging.Logger):
        self._jp_log = logger
        self._manager = manager

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
            if isinstance(e, tornado.web.HTTPError):
                reply["error"] = e.reason
                if hasattr(e, "error_code"):
                    reply["error_code"] = e.error_code
            else:
                reply["error"] = "".join(traceback.format_exception(*exc_info))
        self.finish(json.dumps(reply))


class ListPullRequestsUserHandler(PullRequestsAPIHandler):
    """
    Returns array of a user's pull requests
    Takes parameter 'filter' with following options
        - 'created' returns all pull requests authenticated user has created
        - 'assigned' returns all pull requests assigned to authenticated user
    """

    def validate_request(self, pr_filter):
        if not (pr_filter == "created" or pr_filter == "assigned"):
            raise tornado.web.HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason=f"Invalid parameter 'filter'. Expected value 'created' or 'assigned', received '{pr_filter}'.",
            )

    @tornado.web.authenticated
    async def get(self):

        pr_filter = get_request_attr_value(self, "filter")
        self.validate_request(pr_filter)  # handler specific validation

        current_user = await self._manager.get_current_user()
        prs = await self._manager.list_prs(current_user["username"], pr_filter)
        self.finish(json.dumps(prs))


# -----------------------------------------------------------------------------
# /pullrequests/prs/files Handler
# -----------------------------------------------------------------------------


class ListPullRequestsFilesHandler(PullRequestsAPIHandler):
    """
    Returns array of a pull request's files
    Takes parameter 'id' with the id of the pull request
    """

    @tornado.web.authenticated
    async def get(self):
        pr_id = get_request_attr_value(self, "id")
        files = await self._manager.list_files(pr_id)
        self.finish(json.dumps(files))


# -----------------------------------------------------------------------------
# /pullrequests/files/content Handler
# -----------------------------------------------------------------------------


class PullRequestsFileContentHandler(PullRequestsAPIHandler):
    """
    Returns base and head content
    """

    @tornado.web.authenticated
    async def get(self):
        pr_id = get_request_attr_value(self, "id")
        filename = get_request_attr_value(self, "filename")
        content = await self._manager.get_file_diff(pr_id, filename)
        self.finish(json.dumps(content))


# -----------------------------------------------------------------------------
# /pullrequests/files/comments Handler
# -----------------------------------------------------------------------------


class PullRequestsFileCommentsHandler(PullRequestsAPIHandler):
    """
    Handle comments
    """

    @tornado.web.authenticated
    async def get(self):
        pr_id = get_request_attr_value(self, "id")
        filename = self.get_query_argument("filename", None)
        content = await self._manager.get_threads(pr_id, filename)
        self.finish(json.dumps(content))

    @tornado.web.authenticated
    async def post(self):
        pr_id = get_request_attr_value(self, "id")
        filename = self.get_query_argument("filename", None)
        data = get_body_value(self)
        try:
            if "discussionId" in data:
                body = CommentReply(data["text"], filename, data["discussionId"])
            else:
                body = NewComment(
                    data["text"], filename, data.get("line"), data.get("originalLine")
                )
        except KeyError as e:
            raise tornado.web.HTTPError(
                status_code=HTTPStatus.BAD_REQUEST, reason=f"Missing POST key: {e}"
            )
        result = await self._manager.post_comment(pr_id, body)

        self.set_status(201)
        self.finish(json.dumps(result))


# -----------------------------------------------------------------------------
# Handler utilities
# -----------------------------------------------------------------------------


def get_request_attr_value(handler, arg):
    try:
        param = handler.get_argument(arg)
        if not param:
            get_logger().error(f"Invalid argument '{arg}', cannot be blank.")
            raise tornado.web.HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason=f"Invalid argument '{arg}', cannot be blank.",
            )
        return param
    except tornado.web.MissingArgumentError as e:
        get_logger().error(f"Missing argument '{arg}'.", exc_info=e)
        raise tornado.web.HTTPError(
            status_code=HTTPStatus.BAD_REQUEST, reason=f"Missing argument '{arg}'."
        ) from e


def get_body_value(handler):
    try:
        if not handler.request.body:
            raise ValueError()
        return escape.json_decode(handler.request.body)
    except ValueError as e:
        get_logger().error("Invalid body.", exc_info=e)
        raise tornado.web.HTTPError(
            status_code=HTTPStatus.BAD_REQUEST, reason=f"Invalid POST body: {e}"
        ) from e


# -----------------------------------------------------------------------------
# URL to handler mappings
# -----------------------------------------------------------------------------

default_handlers = [
    ("prs/user", ListPullRequestsUserHandler),
    ("prs/files", ListPullRequestsFilesHandler),
    ("files/content", PullRequestsFileContentHandler),
    ("files/comments", PullRequestsFileCommentsHandler),
]


def setup_handlers(web_app: "NotebookWebApplication", config: PRConfig):
    host_pattern = ".*$"
    base_url = url_path_join(web_app.settings["base_url"], NAMESPACE)

    logger = get_logger()

    manager_class = MANAGERS.get(config.provider)
    if manager_class is None:
        logger.error(f"No manager defined for provider '{config.provider}'.")
        raise NotImplementedError()
    manager = manager_class(config.api_base_url, config.access_token)

    web_app.add_handlers(
        host_pattern,
        [
            (
                url_path_join(base_url, pat),
                handler,
                {"logger": logger, "manager": manager},
            )
            for pat, handler in default_handlers
        ],
    )
