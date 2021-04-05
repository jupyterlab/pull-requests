import asyncio
import difflib
import http
import json
import re
from hashlib import sha1
from itertools import chain
from typing import Dict, List, Optional, Tuple, Union
from urllib.parse import quote

from notebook.utils import url_path_join
from packaging.version import parse
from tornado.httputil import url_concat
from tornado.web import HTTPError

from ..base import CommentReply, NewComment
from ..log import get_logger
from .manager import PullRequestsManager

INVALID_LINE_CODE = re.compile(r'line_code=>\[.*"must be a valid line code".*\]')


class GitLabManager(PullRequestsManager):
    """Pull request manager for GitLab."""

    MINIMAL_VERSION = "13.1"  # Due to pagination https://docs.gitlab.com/ee/api/README.html#pagination

    def __init__(
        self, base_api_url: str = "https://gitlab.com/api/v4/", access_token: str = ""
    ) -> None:
        """
        Args:
            base_api_url: Base REST API url for the versioning service
            access_token: Versioning service access token
        """
        super().__init__(base_api_url=base_api_url, access_token=access_token)
        # Creating new file discussion required some commit sha's so we will cache them
        self._merge_requests_cache = {}  # Dict[str, Dict]
        # Creating discussion on unmodified line requires to figure out the line number
        # in the diff file for the original and the new file using Myers algorithm. So
        # we cache the diff to speed up the process.
        self._file_diff_cache = {}  # Dict[Tuple[str, str], List[difflib.Match]]

    @property
    def per_page_argument(self) -> Optional[Tuple[str, int]]:
        """Returns query argument to set number of items per page.

        Returns
            [str, int]: (query argument name, value)
            None: the provider does not support pagination
        """
        return ("per_page", 100)

    async def check_server_version(self) -> bool:
        """Check if the server is respecting the minimal version.

        Returns:
            Whether the server version is higher than the minimal supported version.
        """
        url = url_path_join(self._base_api_url, "version")
        data = await self._call_gitlab(url, has_pagination=False)
        server_version = data.get("version", "")
        is_valid = True
        if server_version.split(".") < GitLabManager.MINIMAL_VERSION.split("."):
            is_valid = False
            self.log.warning(
                f"GitLab Server version {server_version} is lower than the minimal version "
                f"supported: {GitLabManager.MINIMAL_VERSION}. Some features may not be supported."
            )

        return is_valid

    async def get_current_user(self) -> Dict[str, str]:
        """Get the current user information.

        Returns:
            JSON description of the user matching the access token
        """
        # Check server compatibility
        await self.check_server_version()

        git_url = url_path_join(self._base_api_url, "user")
        data = await self._call_gitlab(git_url, has_pagination=False)

        return {"username": data["username"]}

    async def get_file_diff(self, pr_id: str, filename: str) -> Dict[str, str]:
        """Get the file diff for the pull request.

        Args:
            pr_id: pull request ID endpoint
            filename: The file name
        Returns:
            The file diff description
        """
        merge_request = await self._get_merge_requests(pr_id)

        # Invalid diff cache
        self._file_diff_cache[(pr_id, filename)] = None

        return {
            "base": {
                "label": merge_request["target_branch"],
                "sha": merge_request["diff_refs"]["base_sha"],
                "content": await self.__get_content(
                    merge_request["target_project_id"],
                    filename,
                    merge_request["diff_refs"]["base_sha"],
                ),
            },
            "head": {
                "label": merge_request["source_branch"],
                "sha": merge_request["diff_refs"]["head_sha"],
                "content": await self.__get_content(
                    merge_request["source_project_id"],
                    filename,
                    merge_request["diff_refs"]["head_sha"],
                ),
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
            search_filter = f"author_username={username}"
        elif pr_filter == "assigned":
            search_filter = "scope=assigned_to_me"

        return search_filter

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
        git_url = url_path_join(pr_id, "/discussions")
        results = await self._call_gitlab(git_url)
        discussions = []
        for discussion in results:
            thread = dict(
                id=discussion["id"],
                comments=[],
                filename=filename,
                line=None,
                originalLine=None,
                pullRequestId=pr_id,
            )
            for note in discussion["notes"]:
                if (
                    filename is None
                    and note["type"] != "DiffNote"
                    # Remove auto comment on commit
                    and "[Compare with previous version]" not in note["body"]
                ):
                    thread["comments"].append(GitLabManager._response_to_comment(note))
                elif (
                    note["type"] == "DiffNote"
                    and (note["position"]["new_path"] or note["position"]["new_path"])
                    == filename
                ):
                    if thread["line"] is None:
                        thread["line"] = note["position"]["new_line"]
                    if thread["originalLine"] is None:
                        thread["originalLine"] = note["position"]["old_line"]
                    thread["comments"].append(GitLabManager._response_to_comment(note))
                else:
                    break
            else:
                discussions.append(thread)

        return discussions

    async def list_files(self, pr_id: str) -> List[Dict[str, str]]:
        """Get the list of modified files for a pull request.

        Args:
            pr_id: pull request ID endpoint
        Returns:
            The list of modified files
        """

        git_url = url_path_join(pr_id, "changes")
        results = await self._call_gitlab(git_url)

        data = []
        for result in chain(*map(lambda r: r["changes"], results)):
            status = "modified"
            if result["new_file"]:
                status = "added"
            elif result["renamed_file"]:
                status = "renamed"
            elif result["deleted_file"]:
                status = "removed"

            data.append(
                {
                    "name": result["new_path"],
                    "status": status,
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
            self._base_api_url, "/merge_requests?state=opened&" + search_filter
        )

        results = await self._call_gitlab(git_url)

        data = []
        for result in results:
            url = url_path_join(
                self._base_api_url,
                "projects",
                str(result["project_id"]),
                "merge_requests",
                str(result["iid"]),
            )
            data.append(
                {
                    "id": url,
                    "title": result["title"],
                    "body": result["description"],
                    "internalId": result["id"],
                    "link": result["web_url"],
                }
            )

        # Reset cache
        self._merge_requests_cache = {}

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
        filename = body.filename

        if isinstance(body, CommentReply):
            data = {"body": body.text}
            git_url = url_path_join(pr_id, "discussions", body.inReplyTo, "notes")
            response = await self._call_gitlab(git_url, method="POST", body=data)
            return GitLabManager._response_to_comment(response)
        else:
            data = {"body": body.text}
            if body.line is not None:
                data["position"] = {
                    "position_type": "text",
                    "new_line": body.line,
                    "new_path": filename,
                }
                data["position"].update(
                    (await self._get_merge_requests(pr_id))["diff_refs"]
                )
            elif body.originalLine is not None:
                data["position"] = {
                    "position_type": "text",
                    "old_line": body.originalLine,
                    "old_path": filename,
                }
                data["position"].update(
                    (await self._get_merge_requests(pr_id))["diff_refs"].copy()
                )
            else:
                data["commit_id"] = (await self._get_merge_requests(pr_id))["sha"]

            git_url = url_path_join(pr_id, "discussions")

            try:
                response = await self._call_gitlab(git_url, method="POST", body=data)
            except HTTPError as error:
                if (
                    filename is not None
                    and error.status_code == http.HTTPStatus.BAD_REQUEST
                    and INVALID_LINE_CODE.search(error.reason) is not None
                ):
                    # When targeting an unmodified line to create a thread, both line and original line needs
                    # to be passed. So GitLab can compute the infamous line_code that otherwise shows up
                    # in the unfriendly error message.
                    #
                    # To hopefully get a similar diff than GitLab, we start over from the file content. And we
                    # apply the Myers algorithm
                    matches = await self._get_file_diff(pr_id, filename)
                    new_line = body.line
                    old_line = body.originalLine
                    if body.line is None:
                        for m in matches:
                            if old_line < m.a or old_line >= m.a + m.size:
                                continue
                            new_line = old_line - m.a + m.b
                            break
                    elif body.originalLine is None:
                        for m in matches:
                            if new_line < m.b or new_line >= m.b + m.size:
                                continue
                            old_line = new_line + m.a - m.b
                            break

                    data["position"]["new_line"] = new_line
                    data["position"]["new_path"] = filename
                    data["position"]["old_line"] = old_line
                    data["position"]["old_path"] = None

                    response = await self._call_gitlab(
                        git_url, method="POST", body=data
                    )
                else:
                    raise error

            comment = GitLabManager._response_to_comment(response["notes"][0])
            # Add the discussion ID created by GitLab
            comment["inReplyTo"] = response["id"]
            return comment

    async def _call_gitlab(
        self,
        url: str,
        load_json: bool = True,
        method: str = "GET",
        body: Optional[dict] = None,
        params: Optional[Dict[str, str]] = None,
        has_pagination: bool = True,
    ) -> Union[dict, str]:
        """Call GitLab

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
            has_pagination: Whether the pagination query arguments should be appended
        Returns:
            List or Dict: Create from JSON response body if load_json is True
            str: Raw response body if load_json is False
        """

        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Accept": "application/json",
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

    async def _get_file_diff(self, pr_id: str, filename: str) -> List[difflib.Match]:
        """Compute the list of matching snippet in the diff of filename
        for the given pr_id pull request.

        Args:
            pr_id: The pull request of interest
            filename: The filename of interest
        Returns:
            List of matching lines
        """
        try:
            import diff_match_patch
        except ImportError as e:
            self.log.error(
                "diff-match-patch package is needed by GitLab to post comments.",
                exc_info=e,
            )
            raise HTTPError(
                status_code=http.HTTPStatus.INTERNAL_SERVER_ERROR,
                reason=f"diff-match-patch package is needed by GitLab to post comments. Please install it using pip or conda.",
            ) from e

        file_diff = self._file_diff_cache.get((pr_id, filename))
        if file_diff is None:
            content = await self.get_file_diff(pr_id, filename)

            # Compute the diff using Myers algorithm
            dmp = diff_match_patch.diff_match_patch()
            (text1, text2, linearray) = dmp.diff_linesToChars(
                content["base"]["content"],
                content["head"]["content"],
            )
            diffs = dmp.diff_main(text1, text2, False)
            # Convert the diff back to original text.
            dmp.diff_charsToLines(diffs, linearray)
            # Eliminate freak matches (e.g. blank lines)
            dmp.diff_cleanupSemantic(diffs)

            # Convert to Match object
            file_diff = []
            a = 0
            b = 0
            for diff in diffs:
                size = diff[1].count("\n")
                if diff[0] == 0:
                    file_diff.append(difflib.Match(a=a, b=b, size=size))
                    a += size
                    b += size
                elif diff[0] == -1:
                    a += size
                else:  # diff[0] == 1
                    b += size

            self._file_diff_cache[(pr_id, filename)] = file_diff

        return file_diff

    async def _get_merge_requests(self, pr_id: str) -> dict:
        """Get a single merge request information.

        It uses the cached value if available.

        Args:
            pr_id: The API url of the merge request to request
        Returns:
            The JSON description of the merge request
        """
        merge_request = self._merge_requests_cache.get(pr_id)
        if merge_request is None:
            merge_request = await self._call_gitlab(pr_id, has_pagination=False)
            self._merge_requests_cache[pr_id] = merge_request
        return merge_request

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
            "userName": result["author"]["username"],
            "userPicture": result["author"]["avatar_url"],
        }
        return data

    async def __get_content(self, project_id: int, filename: str, sha: str) -> str:
        url = url_concat(
            url_path_join(
                self._base_api_url,
                "projects",
                str(project_id),
                "repository/files",
                quote(filename, safe=""),
                "raw",
            ),
            {"ref": sha},
        )

        try:
            return await self._call_gitlab(url, load_json=False)
        except HTTPError:
            return ""
