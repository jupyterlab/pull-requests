from __future__ import annotations

import abc
import json
import http
from typing import Dict, List, NoReturn, Optional

import nbformat
import tornado
from nbdime import diff_notebooks
from notebook.utils import url_path_join

from ..log import get_logger


class PullRequestsManager(abc.ABC):
    """Abstract base class for pull requests manager."""

    def __init__(self, base_api_url: str = "", access_token: str = "") -> NoReturn:
        """
        Args:
            base_api_url: Base REST API url for the versioning service
            access_token: Versioning service access token
        """
        self._client = tornado.httpclient.AsyncHTTPClient()
        self._base_api_url = base_api_url
        self._access_token = access_token

    @abc.abstractmethod
    async def get_current_user(self) -> str:
        """Get the current user ID."""
        raise NotImplementedError()

    @abc.abstractmethod
    async def list_prs(self, username: str, pr_filter: str) -> list:
        """Returns the list of PRs for the given user.

        Args:
            username: User ID for the versioning service
            pr_filter: Filter to add to the PRs requests
        Returns:
            The list of PRs
        """
        raise NotImplementedError()

    @abc.abstractmethod
    async def list_files(self, pr_id: str) -> list:
        """Get the list of modified files for a PR.

        Args:
            pr_id: PR ID endpoint
        Returns:
            The list of modified files
        """
        raise NotImplementedError()

    @abc.abstractmethod
    async def get_file_content(self, pr_id: str, filename: str) -> str:
        """Get the file content.

        Args:
            pr_id: PR ID endpoint
            filename: The file name
        Returns:
            The file content
        """
        raise NotImplementedError()

    @abc.abstractmethod
    async def get_threads(
        self, pr_id: str, filename: Optional[str] = None
    ) -> List[dict]:
        """Get the discussions on a file or the pull request.

        Args:
            pr_id: PR ID endpoint
            filename: The file name; None to get the discussion on the pull requests
        Returns:
            The discussions
        """
        raise NotImplementedError()

    @abc.abstractmethod
    async def post_file_comment(self, pr_id: str, filename: str, body: str) -> NoReturn:
        """Create a new comment on a file.

        Args:
            pr_id: PR ID endpoint
            filename: The file name
            body: Comment body
        """
        raise NotImplementedError()

    async def get_file_nbdiff(
        self, prev_content: str, curr_content: str
    ) -> Dict[str, str]:
        """Compute the diff between two notebooks.

        Args:
            prev_content: Notebook previous content
            curr_content: Notebook current content
        Returns:
            {"base": Dict, "diff": Dict}
        """

        def read_notebook(content):
            if not content:
                return nbformat.v4.new_notebook()
            return nbformat.reads(content, as_version=4)

        current_loop = tornado.ioloop.IOLoop.current()
        prev_nb = await current_loop.run_in_executor(None, read_notebook, prev_content)
        curr_nb = await current_loop.run_in_executor(None, read_notebook, curr_content)
        thediff = await current_loop.run_in_executor(
            None, diff_notebooks, prev_nb, curr_nb
        )

        return {"base": prev_nb, "diff": thediff}

    async def _call_service(
        self,
        url: str,
        load_json: bool = True,
        method: str = "GET",
        body=None,
        params: Optional[Dict[str, str]] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        if not self._access_token:
            raise tornado.web.HTTPError(
                status_code=http.HTTPStatus.BAD_REQUEST,
                reason="No access token specified.",
            )

        if body is not None:
            if headers is None:
                headers = {}
            headers["Content-Type"] = "application/json"
            body = json.dumps(body)

        if not url.startswith(self._base_api_url):
            url = "/".join((self._base_api_url.rstrip("/"), url.lstrip("/")))

        if params is not None:
            url = tornado.httputil.url_concat(url, params)

        # User agents required for Github API, see https://developer.github.com/v3/#user-agent-required
        try:
            request = tornado.httpclient.HTTPRequest(
                url,
                validate_cert=True,
                user_agent="JupyterLab Pull Requests",
                method=method.upper(),
                body=body,
                headers=headers,
            )
        except BaseException as e:
            get_logger().error("Failed to create http request", exc_info=e)
            raise tornado.web.HTTPError(
                status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
                reason=f"Invalid _call_service '{method}': {e}",
            ) from e

        get_logger().debug(f"{method.upper()} {url}")
        try:
            response = await self._client.fetch(request)
            result = response.body.decode("utf-8")
            if load_json:
                return json.loads(result)
            else:
                return result
        except tornado.httpclient.HTTPClientError as e:
            get_logger().debug(
                f"Failed to fetch {request.method} {request.url}", exc_info=e
            )
            error_body = (e.response.body or b"{}").decode("utf-8") if e.response is not None else "{}"
            get_logger().debug(error_body)
            if load_json:
                message = json.loads(error_body).get("message", str(e))
            else:
                message = str(e)
            raise tornado.web.HTTPError(
                status_code=e.code, reason=f"Invalid response in '{url}': {message}"
            ) from e
        except ValueError as e:
            get_logger().error("Failed to fetch http request", exc_info=e)
            raise tornado.web.HTTPError(
                status_code=http.HTTPStatus.BAD_REQUEST,
                reason=f"Invalid response in '{url}': {e}",
            ) from e
        except Exception as e:
            get_logger().error("Failed to fetch http request", exc_info=e)
            raise tornado.web.HTTPError(
                status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
                reason=f"Unknown error in '{url}': {e}",
            ) from e
