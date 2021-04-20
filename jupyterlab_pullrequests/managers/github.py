import json
from itertools import chain
from typing import Dict, List, Optional, Tuple, Union

from notebook.utils import url_path_join
from tornado.httputil import url_concat
from tornado.web import HTTPError

from ..base import CommentReply, NewComment, PRConfig
from .manager import PullRequestsManager


class GitHubManager(PullRequestsManager):
    """Pull request manager for GitHub."""

    def __init__(self, config: PRConfig) -> None:
        super().__init__(config)
        self._pull_requests_cache = {}

    @property
    def base_api_url(self):
        return self._config.api_base_url or "https://api.github.com"

    @property
    def per_page_argument(self) -> Optional[Tuple[str, int]]:
        """Returns query argument to set number of items per page.

        Returns
            [str, int]: (query argument name, value)
            None: the provider does not support pagination
        """
        return ("per_page", 100)

    async def get_current_user(self) -> Dict[str, str]:
        """Get the current user information.

        Returns:
            JSON description of the user matching the access token
        """
        git_url = url_path_join(self.base_api_url, "user")
        data = await self._call_github(git_url, has_pagination=False)

        return {"username": data["login"]}

    async def get_file_diff(self, pr_id: str, filename: str) -> Dict[str, str]:
        """Get the file diff for the pull request.

        Args:
            pr_id: pull request ID endpoint
            filename: The file name
        Returns:
            The file diff description
        """
        pull_request = await self._get_pull_requests(pr_id)

        base_content = await self.__get_content(
            pull_request["base"]["repo"]["url"], filename, pull_request["base"]["sha"]
        )
        head_content = await self.__get_content(
            pull_request["head"]["repo"]["url"], filename, pull_request["head"]["sha"]
        )

        return {
            "base": {
                "label": pull_request["base"]["label"],
                "sha": pull_request["base"]["sha"],
                "content": base_content,
            },
            "head": {
                "label": pull_request["head"]["label"],
                "sha": pull_request["head"]["sha"],
                "content": head_content,
            },
        }

    def get_search_filter(self, username: str, pr_filter: str) -> str:
        """Get the query arguments for a given filter.

        Args:
            username: Current username
            pr_filter: Generic pull request filter
        Returns:
            The query arguments for the service
        """

        if pr_filter == "created":
            search_filter = "+author:"
        elif pr_filter == "assigned":
            search_filter = "+assignee:"

        return search_filter + username

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
        git_url = url_path_join(pr_id, "/comments")
        if filename is None:
            results = await self._call_github(git_url.replace("pulls", "issues"))
            return [
                {
                    "id": result["id"],
                    "comments": [GitHubManager._response_to_comment(result)],
                    "pullRequestId": pr_id,
                }
                for result in results
            ]
        else:
            results = await self._call_github(git_url)

            threads = []
            replies = []
            for result in results:
                if result["path"] == filename:
                    if "in_reply_to_id" in result:
                        replies.append(result)
                    else:
                        threads.append([result])

            has_changed = True
            while len(replies) > 0 and has_changed:
                has_changed = False
                for reply in replies.copy():
                    for comments in threads:
                        if comments[-1]["id"] == reply["in_reply_to_id"]:
                            comments.append(reply)
                            replies.remove(reply)
                            has_changed = True

            return [
                {
                    "id": thread[-1]["id"],  # Set discussion id as the last comment id
                    "comments": [GitHubManager._response_to_comment(c) for c in thread],
                    "filename": filename,
                    "line": thread[0]["line"],
                    "originalLine": thread[0]["original_line"]
                    if thread[0]["line"] is None
                    else None,
                    "pullRequestId": pr_id,
                }
                for thread in threads
            ]

    async def list_files(self, pr_id: str) -> List[Dict[str, str]]:
        """Get the list of modified files for a pull request.

        Args:
            pr_id: pull request ID endpoint
        Returns:
            The list of modified files
        """
        git_url = url_path_join(pr_id, "/files")
        results = await self._call_github(git_url)

        data = []
        for result in results:
            data.append(
                {
                    "name": result["filename"],
                    "status": result["status"],
                }
            )

        return data

    async def list_prs(self, username: str, pr_filter: str) -> List[Dict[str, str]]:
        """Returns the list of pull requests for the given user.

        Args:
            username: User ID for the versioning service
            pr_filter: Filter to add to the pull requests requests
        Returns:
            The list of pull requests
        """
        search_filter = self.get_search_filter(username, pr_filter)

        # Use search API to find matching pull requests and return
        git_url = url_path_join(
            self.base_api_url, "/search/issues?q=+state:open+type:pr" + search_filter
        )

        results = await self._call_github(git_url)

        data = []
        for result in chain(*map(lambda r: r["items"], results)):
            data.append(
                {
                    "id": result["pull_request"]["url"],
                    "title": result["title"],
                    "body": result["body"],
                    "internalId": result["id"],
                    "link": result["html_url"],
                }
            )

        # Reset cache
        self._pull_requests_cache = {}

        return data

    async def post_comment(
        self, pr_id: str, body: Union[CommentReply, NewComment]
    ) -> Dict[str, str]:
        """Create a new comment on a file or a the pull request.

        Args:
            pr_id: pull request ID endpoint
            body: Comment body
        Returns:
            The created comment
        """
        git_url = url_path_join(pr_id, "comments")
        filename = body.filename
        if filename is None:
            # Concept of reply does not exist at pull request level in GitHub
            data = {"body": body.text}
            git_url = git_url.replace("pulls", "issues")

        else:
            if isinstance(body, CommentReply):
                data = {"body": body.text, "in_reply_to": body.inReplyTo}
            else:
                data = {
                    "body": body.text,
                    "commit_id": (await self._get_pull_requests(pr_id))["head"]["sha"],
                    "path": filename,
                    "line": body.line or body.originalLine,
                    "side": "RIGHT" if body.line is not None else "LEFT",
                }

        response = await self._call_github(git_url, method="POST", body=data)

        return GitHubManager._response_to_comment(response)

    async def _call_github(
        self,
        url: str,
        load_json: bool = True,
        method: str = "GET",
        body: Optional[dict] = None,
        params: Optional[Dict[str, str]] = None,
        media_type: str = "application/vnd.github.v3+json",
        has_pagination: bool = True,
    ) -> Union[dict, str]:
        """Call GitHub

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
            media_type: Type of accepted content
            has_pagination: Whether the pagination query arguments should be appended
        Returns:
            List or Dict: Create from JSON response body if load_json is True
            str: Raw response body if load_json is False
        """
        headers = {
            "Accept": media_type,
            "Authorization": f"token {self._config.access_token}",
        }

        return await super()._call_provider(
            url,
            load_json=load_json,
            method=method,
            body=body,
            params=params,
            headers=headers,
            has_pagination=has_pagination,
        )

    async def _get_pull_requests(self, pr_id: str) -> dict:
        """Get a single pull request information.

        It uses the cached value if available.

        Args:
            pr_id: The API url of the pull request to request
        Returns:
            The JSON description of the pull request
        """
        pull_request = self._pull_requests_cache.get(pr_id)
        if pull_request is None:
            pull_request = await self._call_github(pr_id, has_pagination=False)
            self._pull_requests_cache[pr_id] = pull_request
        return pull_request

    @staticmethod
    def _response_to_comment(result: Dict[str, str]) -> Dict[str, str]:
        """Format raw comment to generic data structure.

        Args:
            result: Raw comment object from GitLab
        Returns:
            Standardized comment object
        """
        data = {
            "id": result["id"],
            "text": result["body"],
            "updatedAt": result["updated_at"],
            "userName": result["user"]["login"],
            "userPicture": result["user"]["avatar_url"],
            "inReplyToId": result.get("in_reply_to_id"),
        }
        return data

    async def __get_content(self, url: str, filename: str, sha: str) -> str:
        link = url_concat(
            url_path_join(url, "contents", filename),
            {"ref": sha},
        )
        try:
            return await self._call_github(
                link, media_type="application/vnd.github.v3.raw", load_json=False
            )
        except HTTPError as e:
            if e.status_code == 404:
                return ""
            else:
                raise e
