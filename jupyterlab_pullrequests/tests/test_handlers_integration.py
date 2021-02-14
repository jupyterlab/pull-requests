import jupyterlab_pullrequests.handlers
import tornado.web
from asynctest import Mock, patch
from jupyterlab_pullrequests.github_manager import PullRequestsGithubManager
from tornado.httpclient import HTTPClient, HTTPRequest
from tornado.testing import AsyncHTTPTestCase, ExpectLog

# don't authenticate for unit tests
valid_access_token = "valid"
valid_prid = "https://api.github.com/repos/timnlupo/juypterlabpr-test/pulls/1"
valid_prfilename = "test.ipynb"

# Base class for PullRequest test cases
class TestPullRequest(AsyncHTTPTestCase):
    def get_app(self):
        return tornado.web.Application(
            jupyterlab_pullrequests.handlers.default_handlers
        )


# Test list pull requests PAT
class TestListPullRequestsGithubUserHandlerPAT(TestPullRequest):

    # Test no PAT
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_manager",
        Mock(return_value=PullRequestsGithubManager(None)),
    )
    def test_pat_none(self):
        response = self.fetch("/pullrequests/prs/user?filter=created")
        self.assertEqual(response.code, 400)
        self.assertIn("No Github access token specified", response.reason)

    # Test empty PAT
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_manager",
        Mock(return_value=PullRequestsGithubManager("")),
    )
    def test_pat_empty(self):
        response = self.fetch("/pullrequests/prs/user?filter=created")
        self.assertEqual(response.code, 400)
        self.assertIn("No Github access token specified", response.reason)

    # Test invalid PAT
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_manager",
        Mock(return_value=PullRequestsGithubManager("invalid")),
    )
    def test_pat_invalid(self):
        response = self.fetch("/pullrequests/prs/user?filter=created")
        self.assertEqual(response.code, 401)
        self.assertIn("Invalid response in", response.reason)


# Test list pull requests params
@patch(
    "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_manager",
    Mock(return_value=PullRequestsGithubManager(valid_access_token)),
)
class TestListPullRequestsGithubUserHandlerParam(TestPullRequest):

    # Test missing parameter
    def test_param_missing(self):
        response = self.fetch("/pullrequests/prs/user")
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'filter'", response.reason)

    # Test no parameter
    def test_param_none(self):
        response = self.fetch("/pullrequests/prs/user?filter=")
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'filter'", response.reason)

    # Test invalid parameter
    def test_param_invalid(self):
        response = self.fetch("/pullrequests/prs/user?filter=invalid")
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid parameter 'filter'", response.reason)


# Test list files
@patch(
    "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_manager",
    Mock(return_value=PullRequestsGithubManager(valid_access_token)),
)
class TestListPullRequestsGithubFilesHandler(TestPullRequest):

    # Test missing id
    def test_id_missing(self):
        response = self.fetch("/pullrequests/prs/files")
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'id'", response.reason)

    # Test no id
    def test_id_none(self):
        response = self.fetch("/pullrequests/prs/files?id=")
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'id'", response.reason)

    # Test invalid id
    def test_id_invalid(self):
        response = self.fetch("/pullrequests/prs/files?id=google.com")
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid response", response.reason)


# Test get file links
@patch(
    "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_manager",
    Mock(return_value=PullRequestsGithubManager(valid_access_token)),
)
class TestGetPullRequestsGithubFileLinksHandler(TestPullRequest):

    # Test missing id
    def test_id_missing(self):
        response = self.fetch(
            f"/pullrequests/files/content?filename={valid_prfilename}"
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'id'", response.reason)

    # Test no id
    def test_id_none(self):
        response = self.fetch(
            f"/pullrequests/files/content?filename={valid_prfilename}&id="
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'id'", response.reason)

    # Test invalid id
    def test_id_invalid(self):
        response = self.fetch(
            f"/pullrequests/files/content?filename={valid_prfilename}&id=google.com"
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid response", response.reason)

    # Test missing id
    def test_filename_missing(self):
        response = self.fetch(f"/pullrequests/files/content?id={valid_prid}")
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'filename'", response.reason)

    # Test no id
    def test_filename_none(self):
        response = self.fetch(f"/pullrequests/files/content?id={valid_prid}&filename=")
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'filename'", response.reason)


# Test get PR comments
@patch(
    "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_manager",
    Mock(return_value=PullRequestsGithubManager(valid_access_token)),
)
class TestGetPullRequestsCommentsHandler(TestPullRequest):

    # Test missing id
    def test_id_missing(self):
        response = self.fetch(
            f"/pullrequests/files/comments?filename={valid_prfilename}"
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'id'", response.reason)

    # Test no id
    def test_id_none(self):
        response = self.fetch(
            f"/pullrequests/files/comments?filename={valid_prfilename}&id="
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'id'", response.reason)

    # Test invalid id
    def test_id_invalid(self):
        response = self.fetch(
            f"/pullrequests/files/comments?filename={valid_prfilename}&id=google.com"
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid response", response.reason)

    # Test missing id
    def test_filename_missing(self):
        response = self.fetch(f"/pullrequests/files/comments?id={valid_prid}")
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'filename'", response.reason)

    # Test no id
    def test_filename_none(self):
        response = self.fetch(f"/pullrequests/files/comments?id={valid_prid}&filename=")
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'filename'", response.reason)


# Test get PR comments
@patch(
    "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_manager",
    Mock(return_value=PullRequestsGithubManager(valid_access_token)),
)
class TestPostPullRequestsCommentsHandler(TestPullRequest):

    # Test missing id
    def test_id_missing(self):
        response = self.fetch(
            f"/pullrequests/files/comments?filename={valid_prfilename}",
            method="POST",
            body="{}",
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'id'", response.reason)

    # Test no id
    def test_id_none(self):
        response = self.fetch(
            f"/pullrequests/files/comments?filename={valid_prfilename}&id=",
            method="POST",
            body="{}",
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'id'", response.reason)

    # Test invalid id
    def test_id_invalid(self):
        response = self.fetch(
            f"/pullrequests/files/comments?filename={valid_prfilename}&id=google.com",
            method="POST",
            body='{"in_reply_to": 123, "text": "test"}',
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid response", response.reason)

    # Test missing id
    def test_filename_missing(self):
        response = self.fetch(
            f"/pullrequests/files/comments?id={valid_prid}", method="POST", body="{}"
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'filename'", response.reason)

    # Test no id
    def test_filename_none(self):
        response = self.fetch(
            f"/pullrequests/files/comments?id={valid_prid}&filename=",
            method="POST",
            body="{}",
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'filename'", response.reason)

    # Test empty body
    def test_body_empty(self):
        response = self.fetch(
            f"/pullrequests/files/comments?id={valid_prid}&filename={valid_prfilename}",
            method="POST",
            body="",
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid POST body", response.reason)

    # Test invalid body JSON
    def test_body_invalid(self):
        response = self.fetch(
            f"/pullrequests/files/comments?id={valid_prid}&filename={valid_prfilename}",
            method="POST",
            body="{)",
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid POST body", response.reason)

    # Test invalid body JSON
    def test_body_missingkey(self):
        response = self.fetch(
            f"/pullrequests/files/comments?id={valid_prid}&filename={valid_prfilename}",
            method="POST",
            body='{"in_repl_to": 123, "text": "test"}',
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Missing POST key", response.reason)


# Test get PR comments
@patch(
    "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_manager",
    Mock(return_value=PullRequestsGithubManager(valid_access_token)),
)
class TestPostPullRequestsNBDiffHandler(TestPullRequest):

    # Test empty body
    def test_body_empty(self):
        response = self.fetch("/pullrequests/files/nbdiff", method="POST", body="")
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid POST body", response.reason)

    # Test invalid body JSON
    def test_body_invalid(self):
        response = self.fetch("/pullrequests/files/nbdiff", method="POST", body="{)")
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid POST body", response.reason)

    # Test invalid body JSON
    def test_body_missingkey(self):
        response = self.fetch(
            "/pullrequests/files/nbdiff",
            method="POST",
            body='{"body": 123, "curr_content": "test"}',
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Missing POST key", response.reason)

    # Test invalid body JSON
    def test_body_invalid(self):
        response = self.fetch(
            "/pullrequests/files/nbdiff",
            method="POST",
            body='{"prev_content": "bad", "curr_content": "bad"}',
        )
        self.assertEqual(response.code, 500)
        self.assertIn("Error diffing content", response.reason)
