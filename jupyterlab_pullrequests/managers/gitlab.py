import json
from http import HTTPStatus
from urllib.parse import quote
from typing import Dict, List, NoReturn, Optional, Union

from notebook.utils import url_path_join
from tornado.httpclient import AsyncHTTPClient, HTTPClientError, HTTPRequest
from tornado.httputil import url_concat
from tornado.web import HTTPError

from ..base import PRCommentNew, PRCommentReply
from ..log import get_logger
from .manager import PullRequestsManager


class PullRequestsGitLabManager(PullRequestsManager):
    def __init__(
        self, base_api_url: str = "https://gitlab.com/api/v4/", access_token: str = ""
    ) -> NoReturn:
        """
        Args:
            base_api_url: Base REST API url for the versioning service
            access_token: Versioning service access token
        """
        super().__init__(base_api_url=base_api_url, access_token=access_token)

    async def get_current_user(self) -> Dict[str, str]:
        git_url = url_path_join(self._base_api_url, "user")
        data = await self._call_gitlab(git_url)

        return {"username": data["username"]}

    def get_search_filter(self, username: str, pr_filter: str) -> str:

        if pr_filter == "created":
            search_filter = f"author_username={username}"
        elif pr_filter == "assigned":
            search_filter = "scope=assigned_to_me"

        return search_filter 

    async def list_prs(self, username: str, pr_filter: str) -> List[Dict[str, str]]:

        search_filter = self.get_search_filter(username, pr_filter)

        # Use search API to find matching PRs and return
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

        return data

    # -----------------------------------------------------------------------------
    # /pullrequests/prs/files Handler
    # -----------------------------------------------------------------------------

    async def list_files(self, pr_id: str) -> List[Dict[str, str]]:

        git_url = url_path_join(pr_id, "changes")
        results = await self._call_gitlab(git_url)

        data = []
        for result in results["changes"]:
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

    # -----------------------------------------------------------------------------
    # /pullrequests/files/content Handler
    # -----------------------------------------------------------------------------

    async def get_pr_links(self, pr_id: str, filename: str) -> Dict[str, str]:

        data = await self._call_gitlab(pr_id)
        base_url = url_concat(
            url_path_join(
                self._base_api_url,
                "projects",
                str(data["target_project_id"]),
                "repository/files",
                quote(filename, safe=""),
                "raw",
            ),
            {"ref": data["target_branch"]},
        )
        head_url = url_concat(
            url_path_join(
                self._base_api_url,
                "projects",
                str(data["source_project_id"]),
                "repository/files",
                quote(filename, safe=""),
                "raw",
            ),
            {"ref": data["source_branch"]},
        )
        commit_id = data["diff_refs"]["head_sha"]
        return {"baseUrl": base_url, "headUrl": head_url, "commitId": commit_id}

    async def get_link_content(self, file_url: str):
        try:
            return await self._call_gitlab(file_url, False)
        except HTTPError:
            return ""

    async def get_file_content(self, pr_id: str, filename: str) -> Dict[str, str]:

        links = await self.get_pr_links(pr_id, filename)
        
        base_content = await self.get_link_content(links["baseUrl"])
        head_content = await self.get_link_content(links["headUrl"])

        return {
            "baseContent": base_content,
            "headContent": head_content,
            "commitId": links["commitId"],
        }

    # -----------------------------------------------------------------------------
    # /pullrequests/files/comments Handler
    # -----------------------------------------------------------------------------

    def file_comment_response(self, result: Dict[str, str]) -> Dict[str, str]:
        data = {
            "id": result["id"],
            "lineNumber": result["position"]["new_line"],
            "text": result["body"],
            "updatedAt": result["updated_at"],
            "userName": result["author"]["username"],
            "userPic": result["author"]["avatar_url"],
        }
        if "in_reply_to_id" in result:
            data["inReplyToId"] = result["in_reply_to_id"]
        return data

    async def get_file_comments(
        self, pr_id: str, filename: str
    ) -> List[Dict[str, str]]:

        git_url = url_path_join(pr_id, "/discussions")
        results = await self._call_gitlab(git_url)
        comments = []
        for discussion in results:
            for idx, note in enumerate(discussion["notes"]):
                if note["type"] == "DiffNote" and note["position"]["new_path"] == filename:
                    if idx > 0:  # FIXME Change GitHub logic to fit GitLab logic
                        note["in_reply_to_id"] = discussion["notes"][idx - 1]["id"]
                    comments.append(self.file_comment_response(note))
        
        return comments

    async def post_file_comment(
        self, pr_id: str, filename: str, body: Union[PRCommentReply, PRCommentNew]
    ):
        if isinstance(body, PRCommentReply):
            body = {"body": body.text}
            git_url = url_path_join(pr_id, "discussions", "1", "notes")
            response = await self._call_gitlab(git_url, method="POST", body=body)
            return self.file_comment_response(response)
        else:
            body = {
                "body": body.text,
                "commitId": body.commit_id,
                "path": body.filename,
                "position": {"position_type": "text", "new_line": body.position},
            }
            git_url = url_path_join(pr_id, "discussions")
            response = await self._call_gitlab(git_url, method="POST", body=body)
            return self.file_comment_response(response)

    async def _call_gitlab(
        self,
        url: str,
        load_json: bool = True,
        method: str = "GET",
        body=None,
        params: Optional[Dict[str, str]] = None,
    ):
        if not self._access_token:
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason="No Github access token specified.",
            )

        headers = {
            "Authorization": f"Bearer {self._access_token}",
        }

        if not url.startswith(self._base_api_url):
            url = "/".join((self._base_api_url.rstrip("/"), url.lstrip("/")))

        if params is not None:
            url = url_concat(url, params)

        try:
            request = HTTPRequest(
                url,
                validate_cert=True,
                user_agent="JupyterLab Pull Requests",
                method=method.upper(),
                body=None if body is None else json.dumps(body),
                headers=headers,
            )
        except BaseException as e:
            get_logger().error("Failed to create http request", exc_info=e)
            raise HTTPError(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                reason=f"Invalid _call_gitlab '{method}': {e}",
            ) from e

        try:
            get_logger().debug(f"{method.upper()} {url}")
            response = await self._client.fetch(request)
            result = response.body.decode("utf-8")
            if load_json:
                return json.loads(result)
            else:
                return result
        except HTTPClientError as e:
            get_logger().debug(
                f"Failed to fetch {request.method} {request.url}", exc_info=e
            )
            raise HTTPError(
                status_code=e.code, reason=f"Invalid response in '{url}': {e}"
            ) from e
        except ValueError as e:
            get_logger().error("Failed to fetch http request", exc_info=e)
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason=f"Invalid response in '{url}': {e}",
            ) from e
        except Exception as e:
            get_logger().error("Failed to fetch http request", exc_info=e)
            raise HTTPError(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                reason=f"Unknown error in '{url}': {e}",
            ) from e
