import abc
import json
import http
import logging
from typing import Dict, List, NoReturn, Optional, Union

import nbformat
import tornado
from nbdime import diff_notebooks
from notebook.utils import url_path_join

from ..log import get_logger
from .._version import __version__


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

    @property
    def base_api_url(self) -> str:
        """The provider base REST API URL"""
        return self._base_api_url

    @property
    def log(self) -> logging.Logger:
        return get_logger()

    @abc.abstractmethod
    async def get_current_user(self) -> str:
        """Get the current user ID."""
        raise NotImplementedError()

    @abc.abstractmethod
    async def get_file_diff(self, pr_id: str, filename: str) -> dict:
        """Get the file diff for the pull request.

        Args:
            pr_id: pull request ID endpoint
            filename: The file name
        Returns:
            The file diff description
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

    @abc.abstractmethod
    async def get_threads(
        self, pr_id: str, filename: Optional[str] = None
    ) -> List[dict]:
        """Get the discussions on a file or the pull request.

        Args:
            pr_id: pull request ID endpoint
            filename: The file name; None to get the discussion on the pull requests
        Returns:
            The discussions
        """
        raise NotImplementedError()

    @abc.abstractmethod
    async def list_files(self, pr_id: str) -> list:
        """Get the list of modified files for a pull request.

        Args:
            pr_id: pull request ID endpoint
        Returns:
            The list of modified files
        """
        raise NotImplementedError()

    @abc.abstractmethod
    async def list_prs(self, username: str, pr_filter: str) -> list:
        """Returns the list of pull requests for the given user.

        Args:
            username: User ID for the versioning service
            pr_filter: Filter to add to the pull requests requests
        Returns:
            The list of pull requests
        """
        raise NotImplementedError()

    @abc.abstractmethod
    async def post_comment(
        self, pr_id: str, filename: str, body: str
    ) -> Dict[str, str]:
        """Create a new comment on a file or a the pull request.

        Args:
            pr_id: pull request ID endpoint
            filename: The file name; None to comment on the pull request
            body: Comment body
        Returns:
            The created comment
        """
        raise NotImplementedError()

    async def _call_provider(
        self,
        url: str,
        load_json: bool = True,
        method: str = "GET",
        body: Optional[dict] = None,
        params: Optional[Dict[str, str]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Union[dict, str]:
        """Call the third party service

        Args:
            url: Endpoint to request
            load_json: Is the response of JSON type
            method: HTTP method
            body: Request body; None if no body
            params: Query arguments as dictionary; None if no arguments
            headers: Request headers as dictionary; None if no headers
        Returns:
            Dict: Create from JSON response body if load_json is True
            str: Raw response body if load_json is False
        """
        if not self._access_token:
            raise tornado.web.HTTPError(
                status_code=http.HTTPStatus.BAD_REQUEST,
                reason="No access token specified. Please set PRConfig.access_token in your user jupyter_server_config file.",
            )

        if body is not None:
            if headers is None:
                headers = {}
            headers["Content-Type"] = "application/json"
            body = tornado.escape.json_encode(body)

        if not url.startswith(self._base_api_url):
            url = url_path_join(self._base_api_url, url)

        if params is not None:
            url = tornado.httputil.url_concat(url, params)

        # User agents required for Github API, see https://developer.github.com/v3/#user-agent-required
        request = tornado.httpclient.HTTPRequest(
            url,
            user_agent=f"JupyterLab Pull Requests v{__version__}",
            method=method.upper(),
            body=body,
            headers=headers,
        )

        self.log.debug(f"{method.upper()} {url}")
        try:
            response = await self._client.fetch(request)
            result = response.body.decode("utf-8")
            if load_json:
                return json.loads(result)
            else:
                return result
        except tornado.httpclient.HTTPClientError as e:
            self.log.debug(
                f"Failed to fetch {request.method} {request.url}", exc_info=e
            )
            error_body = (
                (e.response.body or b"{}").decode("utf-8")
                if e.response is not None
                else "{}"
            )
            self.log.debug(error_body)
            try:
                message = json.loads(error_body).get("message", str(e))
            except json.JSONDecodeError:
                message = str(e)
            raise tornado.web.HTTPError(
                status_code=e.code, reason=f"Invalid response in '{url}': {message}"
            ) from e
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            self.log.error("Failed to decode the response", exc_info=e)
            raise tornado.web.HTTPError(
                status_code=http.HTTPStatus.BAD_REQUEST,
                reason=f"Invalid response in '{url}': {e}",
            ) from e
        except Exception as e:
            self.log.error("Failed to fetch http request", exc_info=e)
            raise tornado.web.HTTPError(
                status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
                reason=f"Unknown error in '{url}': {e}",
            ) from e
