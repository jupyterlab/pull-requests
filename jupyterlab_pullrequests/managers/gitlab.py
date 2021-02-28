import asyncio
import json
from typing import Dict, List, NoReturn, Optional, Union
from urllib.parse import quote

from notebook.utils import url_path_join
from tornado.httputil import url_concat
from tornado.web import HTTPError

from ..base import CommentReply, NewComment
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
        # Creating new file discussion required some commit sha's so we will cache them
        self._merge_requests_cache = {}

    async def _get_merge_requests(self, id_: str) -> dict:
        merge_request = self._merge_requests_cache.get(id_)
        if merge_request is None:
            merge_request = await self._call_gitlab(id_)
            self._merge_requests_cache[id_] = merge_request
        return merge_request

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

        # Reset cache
        self._merge_requests_cache = {}

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

        data = self._get_merge_requests(pr_id)
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
            return self.response_to_comment(response)
        else:
            data = {"body": body.text}
            if body.line is not None:
                data["position"] = {
                    "position_type": "text",
                    "new_line": body.line,
                    "new_path": filename,
                }
                data["position"].update(self._get_merge_requests(pr_id)["diff_refs"])
            elif body.originalLine is not None:
                data["position"] = {
                    "position_type": "text",
                    "old_line": body.originalLine,
                    "old_path": filename,
                }
                data["position"].update(
                    self._get_merge_requests(pr_id)["diff_refs"].copy()
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
        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Accept": "application/json",
        }

        return await super()._call_service(
            url,
            load_json=load_json,
            method=method,
            body=body,
            params=params,
            headers=headers,
        )
