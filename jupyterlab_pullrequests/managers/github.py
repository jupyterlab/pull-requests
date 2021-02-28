import json
from typing import Dict, List, NoReturn, Optional, Union

from notebook.utils import url_path_join
from tornado.httputil import url_concat
from tornado.web import HTTPError

from ..base import NewComment, CommentReply
from .manager import PullRequestsManager


class PullRequestsGithubManager(PullRequestsManager):
    def __init__(
        self, base_api_url: str = "https://api.github.com", access_token: str = ""
    ) -> NoReturn:
        """
        Args:
            base_api_url: Base REST API url for the versioning service
            access_token: Versioning service access token
        """
        super().__init__(base_api_url=base_api_url, access_token=access_token)

    async def get_current_user(self) -> Dict[str, str]:
        git_url = url_path_join(self._base_api_url, "user")
        data = await self._call_github(git_url)

        return {"username": data["login"]}

    def get_search_filter(self, username: str, pr_filter: str) -> str:

        if pr_filter == "created":
            search_filter = "+author:"
        elif pr_filter == "assigned":
            search_filter = "+assignee:"

        return search_filter + username

    async def list_prs(self, username: str, pr_filter: str) -> List[Dict[str, str]]:

        search_filter = self.get_search_filter(username, pr_filter)

        # Use search API to find matching PRs and return
        git_url = url_path_join(
            self._base_api_url, "/search/issues?q=+state:open+type:pr" + search_filter
        )

        results = await self._call_github(git_url)

        data = []
        for result in results["items"]:
            data.append(
                {
                    "id": result["pull_request"]["url"],
                    "title": result["title"],
                    "body": result["body"],
                    "internalId": result["id"],
                    "link": result["html_url"],
                }
            )

        return data

    # -----------------------------------------------------------------------------
    # /pullrequests/prs/files Handler
    # -----------------------------------------------------------------------------

    async def list_files(self, pr_id: str) -> List[Dict[str, str]]:

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

    # -----------------------------------------------------------------------------
    # /pullrequests/files/content Handler
    # -----------------------------------------------------------------------------

    async def get_pr_links(self, pr_id: str, filename: str) -> Dict[str, str]:

        data = await self._call_github(pr_id)
        base_url = url_concat(
            url_path_join(data["base"]["repo"]["url"], "contents", filename),
            {"ref": data["base"]["ref"]},
        )
        head_url = url_concat(
            url_path_join(data["head"]["repo"]["url"], "contents", filename),
            {"ref": data["head"]["ref"]},
        )
        commit_id = data["head"]["sha"]
        return {"baseUrl": base_url, "headUrl": head_url, "commitId": commit_id}

    async def get_content(self, link: str):
        try:
            return await self._call_github(
                link, media_type="application/vnd.github.v3.raw", load_json=False
            )
        except HTTPError as e:
            if e.status_code == 404:
                return ""
            else:
                raise e

    async def get_file_content(self, pr_id: str, filename: str) -> Dict[str, str]:

        links = await self.get_pr_links(pr_id, filename)

        base_content = await self.get_content(links["baseUrl"])
        head_content = await self.get_content(links["headUrl"])

        return {
            "baseContent": base_content,
            "headContent": head_content,
            "commitId": links["commitId"],
        }

    # -----------------------------------------------------------------------------
    # /pullrequests/files/comments Handler
    # -----------------------------------------------------------------------------

    def response_to_comment(self, result: Dict[str, str]) -> Dict[str, str]:
        data = {
            "id": result["id"],
            "text": result["body"],
            "updatedAt": result["updated_at"],
            "userName": result["user"]["login"],
            "userPicture": result["user"]["avatar_url"],
        }
        return data

    async def get_threads(
        self, pr_id: str, filename: Optional[str] = None
    ) -> List[dict]:
        git_url = url_path_join(pr_id, "/comments")
        if filename is None:
            results = await self._call_github(git_url.replace("pulls", "issues"))
            return [
                {
                    "id": result["id"],
                    "comments": [self.response_to_comment(result)],
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
                    "comments": [self.response_to_comment(c) for c in thread],
                    "filename": filename,
                    "line": thread[0]["line"],
                    "originalLine": thread[0]["original_line"]
                    if thread[0]["line"] is None
                    else None,
                    "pullRequestId": pr_id,
                }
                for thread in threads
            ]

    async def post_file_comment(
        self, pr_id: str, filename: Optional[str], body: Union[CommentReply, NewComment]
    ):
        # FIXME
        if isinstance(body, CommentReply):
            body = {"body": body.text, "in_reply_to": body.inReplyTo}
        else:
            body = {
                "body": body.text,
                # "commit_id": body.commitId,
                "path": filename,
                "position": body.line or body.originalLine,
            }
        git_url = url_path_join(pr_id, "comments")
        response = await self._call_github(git_url, method="POST", body=body)
        print(response)
        return self.response_to_comment(response)

    # -----------------------------------------------------------------------------
    # Handler utilities
    # -----------------------------------------------------------------------------

    async def _call_github(
        self,
        url: str,
        load_json: bool = True,
        method: str = "GET",
        body=None,
        params: Optional[Dict[str, str]] = None,
        media_type: str = "application/vnd.github.v3+json",
    ):
        headers = {
            "Accept": media_type,
            "Authorization": f"token {self._access_token}",
        }

        return await super()._call_service(
            url,
            load_json=load_json,
            method=method,
            body=body,
            params=params,
            headers=headers,
        )
