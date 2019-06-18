import jupyterlab_pullrequests.handlers
import tornado.web
from asynctest import Mock, patch
from tornado.testing import AsyncHTTPTestCase, ExpectLog

import test_config

# test_config.py redacted for security
# contains valid_access_token str with valid Github personal access token
valid_access_token = test_config.valid_access_token
valid_prid = "https://api.github.com/repos/timnlupo/juypterlabpr-test/pulls/1"
valid_prfilename = "test.ipynb"

# Base class for PullRequest test cases
class TestPullRequest(AsyncHTTPTestCase):

    def get_app(self):
        return tornado.web.Application(jupyterlab_pullrequests.handlers.default_handlers)

# Test list pull requests PAT
class TestListPullRequestsGithubUserHandlerPAT(TestPullRequest):

    # Test no PAT
    @patch("jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",Mock(return_value=None))
    def test_pat_none(self):
        response = self.fetch('/pullrequests/prs/user?filter=created')
        self.assertEqual(response.code, 400)
        self.assertIn("No Github access token specified", response.reason)

    # Test empty PAT
    @patch("jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",Mock(return_value=""))
    def test_pat_empty(self):
        response = self.fetch('/pullrequests/prs/user?filter=created')
        self.assertEqual(response.code, 400)
        self.assertIn("No Github access token specified", response.reason)

    # Test invalid PAT
    @patch("jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",Mock(return_value="invalid"))
    def test_pat_invalid(self):
        response = self.fetch('/pullrequests/prs/user?filter=created')
        self.assertEqual(response.code, 401)
        self.assertIn("Invalid Github access token specified", response.reason)

    # Test valid parameter and PAT
    @patch("jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",Mock(return_value=valid_access_token))
    def test_pat_valid(self):
        response = self.fetch('/pullrequests/prs/user?filter=created')
        self.assertEqual(response.code, 200)

# Test list pull requests params
@patch("jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",Mock(return_value=valid_access_token))
class TestListPullRequestsGithubUserHandlerParam(TestPullRequest):

    # Test missing parameter
    def test_param_missing(self):
        response = self.fetch('/pullrequests/prs/user')
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'filter'", response.reason)

    # Test no parameter
    def test_param_none(self):
        response = self.fetch('/pullrequests/prs/user?filter=')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'filter'", response.reason)

    # Test invalid parameter
    def test_param_invalid(self):
        response = self.fetch('/pullrequests/prs/user?filter=invalid')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid parameter 'filter'", response.reason)

    # Test valid parameter
    def test_param_valid(self):
        response = self.fetch('/pullrequests/prs/user?filter=created')
        self.assertEqual(response.code, 200)

# Test list files
@patch("jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",Mock(return_value=valid_access_token))
class TestListPullRequestsGithubFilesHandler(TestPullRequest):

    # Test missing id
    def test_id_missing(self):
        response = self.fetch('/pullrequests/prs/files')
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'id'", response.reason)

    # Test no id
    def test_id_none(self):
        response = self.fetch('/pullrequests/prs/files?id=')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'id'", response.reason)

    # Test invalid id
    def test_id_invalid(self):
        response = self.fetch('/pullrequests/prs/files?id=google.com')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid response", response.reason)

    # Test valid id
    def test_id_valid(self):
        response = self.fetch(f'/pullrequests/prs/files?id={valid_prid}')
        self.assertEqual(response.code, 200)

# Test get file links
@patch("jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",Mock(return_value=valid_access_token))
class TestGetPullRequestsGithubFileLinksHandler(TestPullRequest):

    # Test missing id
    def test_id_missing(self):
        response = self.fetch(f'/pullrequests/files/content?filename={valid_prfilename}')
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'id'", response.reason)

    # Test no id
    def test_id_none(self):
        response = self.fetch(f'/pullrequests/files/content?filename={valid_prfilename}&id=')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'id'", response.reason)

    # Test invalid id
    def test_id_invalid(self):
        response = self.fetch(f'/pullrequests/files/content?filename={valid_prfilename}&id=google.com')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid response", response.reason)

    # Test missing id
    def test_filename_missing(self):
        response = self.fetch(f'/pullrequests/files/content?id={valid_prid}')
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'filename'", response.reason)

    # Test no id
    def test_filename_none(self):
        response = self.fetch(f'/pullrequests/files/content?id={valid_prid}&filename=')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid argument 'filename'", response.reason)

    # Test valid params
    def test_params_valid(self):
        response = self.fetch(f'/pullrequests/files/content?filename={valid_prfilename}&id={valid_prid}')
        self.assertEqual(response.code, 200)
        self.assertIn("base_content", str(response.body))
        self.assertIn("head_content", str(response.body))
