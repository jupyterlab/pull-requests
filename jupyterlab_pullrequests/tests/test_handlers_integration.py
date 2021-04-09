import tornado.web
from tornado.testing import AsyncHTTPTestCase

import jupyterlab_pullrequests.handlers
from jupyterlab_pullrequests.base import PRConfig
from jupyterlab_pullrequests.handlers import setup_handlers

valid_prid = "https://api.github.com/repos/timnlupo/juypterlabpr-test/pulls/1"
valid_prfilename = "test.ipynb"


# Base class for PullRequest test cases
class TestPullRequest(AsyncHTTPTestCase):
    test_api_base_url = "https://api.github.com"
    test_access_token = "valid"

    def get_app(self):
        app = tornado.web.Application()
        app.settings["base_url"] = "/"
        setup_handlers(
            app,
            PRConfig(
                api_base_url=self.test_api_base_url,
                access_token=self.test_access_token
            ),
        )
        return app


class TestListPullRequestsGithubUserHandlerEmptyPAT(TestPullRequest):
    test_access_token = ""

    # Test empty PAT
    def test_pat_empty(self):
        response = self.fetch("/pullrequests/prs/user?filter=created")
        self.assertEqual(response.code, 400, f"{response.body}")
        self.assertIn("No access token specified", response.reason)


class TestListPullRequestsGithubUserHandlerInvalidPAT(TestPullRequest):
    test_access_token = "invalid"

    # Test invalid PAT
    def test_pat_invalid(self):
        response = self.fetch("/pullrequests/prs/user?filter=created")
        self.assertEqual(response.code, 401)
        self.assertIn("Invalid response in", response.reason)


# Test list pull requests params
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


class TestListPullRequestsGithubFilesHandlerBadID(TestPullRequest):
    test_api_base_url = ""

    # Test invalid id
    def test_id_invalid(self):
        response = self.fetch("/pullrequests/prs/files?id=https://google.com")
        assert response.code >= 400, f"{response.body}"
        self.assertIn("Invalid response", response.reason)


# Test get file links
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


class TestGetPullRequestsGithubFileLinksHandlerID(TestPullRequest):
    test_api_base_url = ""

    # Test invalid id
    def test_id_invalid(self):
        response = self.fetch(
            f"/pullrequests/files/content?filename={valid_prfilename}&id=https://google.com"
        )
        assert response.code >=400, f"{response.body}"
        self.assertIn("Invalid response", response.reason)


# Test get PR comments
class TestGetPullRequestsCommentsHandler(TestPullRequest):

    # Test missing id
    def test_id_missing(self):
        response = self.fetch(
            f"/pullrequests/files/comments?filename={valid_prfilename}"
        )
        assert response.code >=400, f"{response.body}"
        self.assertIn("Missing argument 'id'", response.reason)

    # Test no id
    def test_id_none(self):
        response = self.fetch(
            f"/pullrequests/files/comments?filename={valid_prfilename}&id="
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'id'", response.reason)

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


class TestGetPullRequestsCommentsHandler(TestPullRequest):
    test_api_base_url = ""

    # Test invalid id
    def test_id_invalid(self):
        response = self.fetch(
            f"/pullrequests/files/comments?filename={valid_prfilename}&id=https://google.com"
        )
        assert response.code >=400, f"{response.body}"
        self.assertIn("Invalid response", response.reason)


# Test get PR comments
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
            body='{"discussionId": 123, "tex": "test"}',
        )
        self.assertEqual(response.code, 400)
        self.assertIn("Missing POST key", response.reason)


class TestPostPullRequestsCommentsHandlerID(TestPullRequest):
    test_api_base_url = ""

    # Test invalid id
    def test_id_invalid(self):
        response = self.fetch(
            f"/pullrequests/files/comments?filename={valid_prfilename}&id=https://google.com",
            method="POST",
            body='{"in_reply_to": 123, "text": "test"}',
        )
        assert response.code >=400, f"{response.body}"
        self.assertIn("Invalid response", response.reason)
