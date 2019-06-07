import jupyterlab_pullrequests.handlers
import tornado.web
from asynctest import Mock, patch
from tornado.testing import AsyncHTTPTestCase, ExpectLog

import test_config

# test_config.py redacted for security
# contains valid_access_token str with valid Github personal access token
valid_access_token = test_config.valid_access_token

class TestPullRequestHandlers(AsyncHTTPTestCase):

    def get_app(self):
        return tornado.web.Application(jupyterlab_pullrequests.handlers.default_handlers)

    # LIST PR HANDLER: Test missing parameter
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value=valid_access_token),
    )
    def test_listprhandler_param_missing(self):
        response = self.fetch('/pullrequests/prs/user')
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'filter'", response.reason)

    # LIST PR HANDLER: Test no parameter
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value=valid_access_token),
    )
    def test_listprhandler_param_none(self):
        response = self.fetch('/pullrequests/prs/user?filter=')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid parameter 'filter'", response.reason)

    # LIST PR HANDLER: Test invalid parameter
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value=valid_access_token),
    )
    def test_listprhandler_param_invalid(self):
        response = self.fetch('/pullrequests/prs/user?filter=invalid')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid parameter 'filter'", response.reason)

    # LIST PR HANDLER: Test no PAT
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value=None),
    )
    def test_getcurrentuser_pat_none(self):
        response = self.fetch('/pullrequests/prs/user?filter=created')
        self.assertEqual(response.code, 400)
        self.assertIn("No Github access token specified", response.reason)

    # LIST PR HANDLER: Test empty PAT
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value=""),
    )
    def test_getcurrentuser_pat_empty(self):
        response = self.fetch('/pullrequests/prs/user?filter=created')
        self.assertEqual(response.code, 400)
        self.assertIn("No Github access token specified", response.reason)

    # LIST PR HANDLER: Test invalid PAT
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value="invalid"),
    )
    def test_getcurrentuser_pat_invalid(self):
        response = self.fetch('/pullrequests/prs/user?filter=created')
        self.assertEqual(response.code, 401)
        self.assertIn("Invalid Github access token specified", response.reason)

    # LIST PR HANDLER: Test valid parameter and PAT
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value=valid_access_token),
    )
    def test_listprhandler_param_valid(self):
        response = self.fetch('/pullrequests/prs/user?filter=created')
        self.assertEqual(response.code, 200)

    # LIST FILES HANDLER: Test missing id
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value=valid_access_token),
    )
    def test_listfileshandler_id_missing(self):
        response = self.fetch('/pullrequests/prs/files')
        self.assertEqual(response.code, 400)
        self.assertIn("Missing argument 'id'", response.reason)

    # LIST FILES HANDLER: Test no id
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value=valid_access_token),
    )
    def test_listfileshandler_prurl_none(self):
        response = self.fetch('/pullrequests/prs/files?id=')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid parameter 'id'", response.reason)

    # LIST FILES HANDLER: Test invalid id
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value=valid_access_token),
    )
    def test_listfileshandler_prurl_invalid(self):
        response = self.fetch('/pullrequests/prs/files?id=google.com')
        self.assertEqual(response.code, 400)
        self.assertIn("Invalid parameter 'id'", response.reason)

    # LIST FILES HANDLER: Test valid id
    @patch(
        "jupyterlab_pullrequests.base.PullRequestsAPIHandler.get_access_token",
        Mock(return_value=valid_access_token),
    )
    def test_listfileshandler_id_valid(self):
        response = self.fetch('/pullrequests/prs/files?id=https://api.github.com/repos/timnlupo/jupyterlab-playground/pulls/1')
        self.assertEqual(response.code, 200)