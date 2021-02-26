import asyncio
import json
from http import HTTPStatus
from urllib.parse import quote
from typing import Dict, List, NoReturn, Optional, Union

from notebook.utils import url_path_join
from tornado.httpclient import AsyncHTTPClient, HTTPClientError, HTTPRequest
from tornado.httputil import url_concat
from tornado.web import HTTPError

from ..base import NewComment, CommentReply
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
        self._merge_requests_cache = (
            {}
        )  # Creating new file discussion required some commit sha's so we will cache them

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
            # We need to request specifically the single MR endpoint to get the diff_refs
            # and some other information for
            self._merge_requests_cache[url] = await self._call_gitlab(url)
            data.append(
                {
                    "id": url,
                    "title": result["title"],
                    "body": result["description"],
                    "internalId": result["id"],
                    "link": result["web_url"],
                }
            )

        all_mrs = await asyncio.gather(*[self._call_gitlab(d["id"]) for d in data])
        self._merge_requests_cache = {d["id"]: e for d, e in zip(data, all_mrs)}

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

        data = self._merge_requests_cache[pr_id]
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
        return {"baseUrl": base_url, "headUrl": head_url}

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
        }

    # -----------------------------------------------------------------------------
    # /pullrequests/files/comments Handler
    # -----------------------------------------------------------------------------

    def response_to_comment(self, result: Dict[str, str]) -> Dict[str, str]:
        data = {
            "id": result["id"],
            "text": result["body"],
            "updatedAt": result["updated_at"],
            "userName": result["author"]["username"],
            "userPicture": result["author"]["avatar_url"],
        }
        return data

    async def get_threads(
        self, pr_id: str, filename: Optional[str] = None
    ) -> List[dict]:
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
                if filename is None and note["type"] != "DiffNote":
                    thread["comments"].append(self.response_to_comment(note))
                elif (
                    note["type"] == "DiffNote"
                    and (note["position"]["new_path"] or note["position"]["new_path"])
                    == filename
                ):
                    if thread["line"] is None:
                        thread["line"] = note["position"]["new_line"]
                    if thread["originalLine"] is None:
                        thread["originalLine"] = note["position"]["old_line"]
                    thread["comments"].append(self.response_to_comment(note))
                else:
                    break
            else:
                discussions.append(thread)

        return discussions

    async def post_file_comment(
        self, pr_id: str, filename: str, body: Union[CommentReply, NewComment]
    ):
        if isinstance(body, CommentReply):
            data = {"body": body.text}
            git_url = url_path_join(pr_id, "discussions", body.inReplyTo, "notes")
            response = await self._call_gitlab(git_url, method="POST", body=data)
            get_logger().info(str(response))
            return self.response_to_comment(response)
        else:
            data = {"body": body.text}
            if body.line is not None:
                data["position"] = {
                    "position_type": "text",
                    "new_line": body.line,
                    "new_path": filename,
                }
                data["position"].update(self._merge_requests_cache[pr_id]["diff_refs"])
            elif body.originalLine is not None:
                data["position"] = {
                    "position_type": "text",
                    "old_line": body.originalLine,
                    "old_path": filename,
                }
                data["position"].update(
                    self._merge_requests_cache[pr_id]["diff_refs"].copy()
                )

            git_url = url_path_join(pr_id, "discussions")
            response = await self._call_gitlab(git_url, method="POST", body=data)
            
            comment = self.response_to_comment(response["notes"][0])
            # Add the discussion ID created by GitLab
            comment["inReplyTo"] = response["id"]
            return comment

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
            "Accept": "application/json",
        }

        if body is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(body)

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
                body=body,
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
