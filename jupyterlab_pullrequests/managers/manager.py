import abc
import http
import json
import logging
from typing import Dict, List, Optional, Tuple, Union

import nbformat
import tornado
from notebook.utils import url_path_join

from .._version import __version__
from ..log import get_logger


class PullRequestsManager(abc.ABC):
    """Abstract base class for pull requests manager."""

    def __init__(self, base_api_url: str = "", access_token: str = "") -> None:
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

    @property
    def per_page_argument(self) -> Optional[Tuple[str, int]]:
        """Returns query argument to set number of items per page.

        Returns
            [str, int]: (query argument name, value)
            None: the provider does not support pagination
        """
        return None

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
        has_pagination: bool = True,
    ) -> Union[dict, str]:
        """Call the third party service

        The request is presumed to support pagination by default if
        - The method is GET
        - load_json is True
        - The provider returns not None per_page_argument property

        Args:
            url: Endpoint to request
            load_json: Is the response of JSON type
            method: HTTP method
            body: Request body; None if no body
            params: Query arguments as dictionary; None if no arguments
            headers: Request headers as dictionary; None if no headers
            has_pagination: Whether the pagination query arguments should be appended
        Returns:
            List or Dict: Create from JSON response body if load_json is True
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

        with_pagination = False
        if (
            load_json
            and has_pagination
            and method.lower() == "get"
            and self.per_page_argument is not None
        ):
            with_pagination = True
            params = params or {}
            params.update([self.per_page_argument])

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
                # Handle pagination
                # Assume the link to be a comma separated list of <url>; rel="relation"
                # where the next chunk has `relation`=next
                link = response.headers.get("Link")
                next_url = None
                if link is not None:
                    for e in link.split(","):
                        args = e.strip().split(";")
                        data = args[0]
                        metadata = {
                            k.strip(): v.strip().strip('"')
                            for k, v in map(lambda s: s.strip().split("="), args[1:])
                        }
                        if metadata.get("rel", "") == "next":
                            next_url = data[1:-1]
                            break

                new_ = json.loads(result)
                if next_url is not None:
                    next_ = await self._call_provider(
                        next_url,
                        load_json=load_json,
                        method=method,
                        body=body,
                        headers=headers,
                        has_pagination=False,  # Relevant query arguments should be part of the link header
                    )
                    if not isinstance(new_, list):
                        new_ = [new_]
                    if not isinstance(next_, list):
                        next_ = [next_]
                    return new_ + next_
                else:
                    if with_pagination and not isinstance(new_, list):
                        return [new_]
                    else:
                        return new_
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
