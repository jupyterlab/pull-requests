import json
from http import HTTPStatus
from typing import Dict, List, NoReturn, Optional, Union

from notebook.utils import url_path_join
from tornado.httpclient import AsyncHTTPClient, HTTPClientError, HTTPRequest
from tornado.httputil import url_concat
from tornado.web import HTTPError

from ..base import NewComment, CommentReply
from ..log import get_logger
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
        data = await self.call_github(git_url)

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

        results = await self.call_github(git_url)

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
        results = await self.call_github(git_url)

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

        data = await self.call_github(pr_id)
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

    async def validate_pr_link(self, link: str):
        try:
            data = await self.call_github(link)
            return data["download_url"]
        except HTTPError as e:
            if e.status_code == 404:
                return ""
            else:
                raise e

    async def get_link_content(self, file_url: str):

        if file_url == "":
            return ""
        result = await self.call_github(file_url, False)
        return result

    async def get_file_content(self, pr_id: str, filename: str) -> Dict[str, str]:

        links = await self.get_pr_links(pr_id, filename)

        base_raw_url = await self.validate_pr_link(links["baseUrl"])
        head_raw_url = await self.validate_pr_link(links["headUrl"])

        base_content = await self.get_link_content(base_raw_url)
        head_content = await self.get_link_content(head_raw_url)

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
            "lineNumber": result["position"],
            "text": result["body"],
            "updatedAt": result["updated_at"],
            "userName": result["user"]["login"],
            "userPic": result["user"]["avatar_url"],
        }
        if "in_reply_to_id" in result:
            data["inReplyToId"] = result["in_reply_to_id"]
        return data

    async def get_threads(
        self, pr_id: str, filename: Optional[str] = None
    ) -> List[dict]:
        # FIXME
        git_url = url_path_join(pr_id, "/comments")
        results = await self.call_github(git_url)
        return [
            self.file_comment_response(result)
            for result in results
            if result["path"] == filename
        ]

    async def post_file_comment(
        self, pr_id: str, filename: str, body: Union[CommentReply, NewComment]
    ):

        if isinstance(body, CommentReply):
            body = {"body": body.text, "in_reply_to": body.in_reply_to}
        else:
            body = {
                "body": body.text,
                "commit_id": body.commitId,
                "path": body.filename,
                "position": body.position,
            }
        git_url = url_path_join(pr_id, "comments")
        response = await self.call_github(git_url, method="POST", body=body)
        return self.file_comment_response(response)

    # -----------------------------------------------------------------------------
    # Handler utilities
    # -----------------------------------------------------------------------------

    async def call_github(
        self,
        git_url: str,
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
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"token {self._access_token}",
        }

        if not git_url.startswith(self._base_api_url):
            git_url = "/".join((self._base_api_url.rstrip("/"), git_url.lstrip("/")))

        if params is not None:
            git_url = url_concat(git_url, params)

        # User agents required for Github API, see https://developer.github.com/v3/#user-agent-required
        try:
            request = HTTPRequest(
                git_url,
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
                reason=f"Invalid call_github '{method}': {e}",
            ) from e

        try:
            response = await self._client.fetch(request)
            result = response.body.decode("utf-8")
            if load_json:
                return json.loads(result)
            else:
                return result
        except HTTPClientError as e:
            get_logger().error(
                f"Failed to fetch {request.method} {request.url}", exc_info=e
            )
            raise HTTPError(
                status_code=e.code, reason=f"Invalid response in '{git_url}': {e}"
            ) from e
        except ValueError as e:
            get_logger().error("Failed to fetch http request", exc_info=e)
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason=f"Invalid response in '{git_url}': {e}",
            ) from e
        except Exception as e:
            get_logger().error("Failed to fetch http request", exc_info=e)
            raise HTTPError(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                reason=f"Unknown error in '{git_url}': {e}",
            ) from e
