import json
from http import HTTPStatus

import tornado.gen as gen
from jupyterlab_pullrequests.manager import PullRequestsManager
from notebook.utils import url_path_join
from tornado.httpclient import AsyncHTTPClient, HTTPClientError, HTTPRequest
from tornado.httputil import url_concat
from tornado.web import HTTPError

GITHUB_API_BASE_URL = "https://api.github.com"

class PullRequestsGithubManager(PullRequestsManager):

    # -----------------------------------------------------------------------------
    # /pullrequests/prs/user Handler
    # -----------------------------------------------------------------------------

    @gen.coroutine
    def get_current_user(self):

        if not self.access_token:
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason="No Github access token specified."
            )

        git_url = url_path_join(GITHUB_API_BASE_URL, "user")
        data = yield self.call_github(git_url)
        
        return {'username': data["login"]}

    def get_search_filter(self, username, pr_filter):

        if pr_filter == "created":
            search_filter = "+author:"
        elif pr_filter == "assigned":
            search_filter = "+assignee:"

        return search_filter + username

    @gen.coroutine
    def list_prs(self, username, pr_filter):

        search_filter = self.get_search_filter(username, pr_filter)

        # Use search API to find matching PRs and return
        git_url = url_path_join(
            GITHUB_API_BASE_URL, "/search/issues?q=+state:open+type:pr" + search_filter
        )

        results = yield self.call_github(git_url)

        data = []
        for result in results["items"]:
            data.append({
                'id': result["pull_request"]["url"],
                'title': result["title"],
                'body': result["body"],
                'internal_id': result["id"],
                'url': result["html_url"]
            })

        return data

    # -----------------------------------------------------------------------------
    # /pullrequests/prs/files Handler
    # -----------------------------------------------------------------------------

    @gen.coroutine
    def list_files(self, pr_id):

        git_url = url_path_join(pr_id, "/files")
        results = yield self.call_github(git_url)

        data = []
        for result in results:
            data.append({
                'name': result["filename"],
                'status': result["status"],
                'additions': result["additions"],
                'deletions': result["deletions"]
            })

        return data

    # -----------------------------------------------------------------------------
    # /pullrequests/files/content Handler
    # -----------------------------------------------------------------------------

    @gen.coroutine
    def get_pr_links(self, pr_id, filename):

        data = yield self.call_github(pr_id)
        base_url = url_concat(url_path_join(data["base"]["repo"]["url"],"contents",filename), {"ref": data["base"]["ref"]})
        head_url = url_concat(url_path_join(data["head"]["repo"]["url"],"contents",filename), {"ref": data["head"]["ref"]})
        commit_id = data["head"]["sha"]
        return {'base_url':base_url, 'head_url':head_url, 'commit_id':commit_id}

    @gen.coroutine
    def validate_pr_link(self, link):
        try:
            data = yield self.call_github(link)
            return data["download_url"]
        except HTTPError as e:
            if e.status_code == 404:
                return ""
            else:
                raise e

    @gen.coroutine
    def get_link_content(self, file_url):

        if (file_url == ""):
            return ""
        result = yield self.call_github(file_url, False)
        return result

    @gen.coroutine
    def get_file_content(self, pr_id, filename):

        links = yield self.get_pr_links(pr_id, filename)

        base_raw_url = yield self.validate_pr_link(links["base_url"])
        head_raw_url = yield self.validate_pr_link(links["head_url"])

        base_content = yield self.get_link_content(base_raw_url)
        head_content = yield self.get_link_content(head_raw_url)
        
        return {'base_content':base_content, 'head_content':head_content, 'commit_id':links["commit_id"]}

    # -----------------------------------------------------------------------------
    # /pullrequests/files/comments Handler
    # -----------------------------------------------------------------------------

    def file_comment_response(self, result):
        data = {
            'id': result["id"],
            'line_number': result["position"],
            'text': result["body"],
            'updated_at': result["updated_at"],
            'user_name': result["user"]["login"],
            'user_pic': result["user"]["avatar_url"]
        }
        if 'in_reply_to_id' in result:
            data['in_reply_to_id'] = result["in_reply_to_id"]
        return data

    @gen.coroutine
    def get_file_comments(self, pr_id, filename):

        git_url = url_path_join(pr_id, "/comments")
        results = yield self.call_github(git_url)
        return [self.file_comment_response(result) for result in results if result["path"] == filename]

    @gen.coroutine
    def post_file_comment(self, pr_id, filename, body):

        if type(body).__name__ == 'PRCommentReply':
            body = {"body": body.text, "in_reply_to": body.in_reply_to}
        else:
            body = {"body": body.text, "commit_id": body.commit_id, "path": body.filename, "position": body.position}
        git_url = url_path_join(pr_id,"comments")
        response = yield self.call_github(git_url, method="POST", body=body)
        return self.file_comment_response(response)

    # -----------------------------------------------------------------------------
    # Handler utilities
    # -----------------------------------------------------------------------------

    @gen.coroutine
    def call_github(self, git_url, load_json=True, method="GET", body=None):

        params = {"Accept": "application/vnd.github.v3+json", "access_token": self.access_token}

        # User agents required for Github API, see https://developer.github.com/v3/#user-agent-required
        try:
            if method.lower() == "get":
                request = HTTPRequest(
                    url_concat(git_url, params), validate_cert=True, user_agent="JupyterLab Pull Requests"
                )
            elif method.lower() == "post":
                request = HTTPRequest(
                    url_concat(git_url, params), validate_cert=True, user_agent="JupyterLab Pull Requests", method="POST", body=json.dumps(body)
                )
            else:
                raise ValueError()
        except:
            HTTPError(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                reason=f"Invalid call_github '{method}': {e}"
            )

        try:
            response = yield self.client.fetch(request)
            result = response.body.decode("utf-8")
            if load_json:
                return json.loads(result)
            else:
                return result
        except HTTPClientError as e:
            raise HTTPError(
                status_code=e.code,
                reason=f"Invalid response in '{git_url}': {e}"
            )
        except ValueError as e:
            raise HTTPError(
                status_code=HTTPStatus.BAD_REQUEST,
                reason=f"Invalid response in '{git_url}': {e}"
            )
        except Exception as e:
            raise HTTPError(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                reason=f"Unknown error in '{git_url}': {e}"
            )
