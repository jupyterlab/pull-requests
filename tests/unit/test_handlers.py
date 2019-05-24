import json
import pytest
from asynctest import Mock, patch, CoroutineMock, MagicMock, call
from jupyterlab_pullrequests.handlers import ListPullRequestsGithubUserHandler, get_current_user
from jupyterlab_pullrequests.base import HTTPError
from tornado.web import MissingArgumentError


# Test missing parameter
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.__init__",
    Mock(return_value=None),
)
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.get_argument",
    Mock(return_value="created", side_effect=MissingArgumentError('foo')),
)
def test_listprhandler_param_missing():

    with (pytest.raises(HTTPError)) as e:
        ListPullRequestsGithubUserHandler().validate_request()

    assert e.value.status_code == 400
    assert "Missing argument 'filter'" in e.value.reason


# Test no parameter
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.__init__",
    Mock(return_value=None),
)
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.get_argument",
    Mock(return_value=""),
)
def test_listprhandler_param_none():

    with (pytest.raises(HTTPError)) as e:
        ListPullRequestsGithubUserHandler().validate_request()

    assert e.value.status_code == 400
    assert "Invalid parameter 'filter'" in e.value.reason


# Test invalid parameter
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.__init__",
    Mock(return_value=None),
)
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.get_argument",
    Mock(return_value="create"),
)
def test_listprhandler_param_invalid():

    with (pytest.raises(HTTPError)) as e:
        ListPullRequestsGithubUserHandler().validate_request()

    assert e.value.status_code == 400
    assert "Invalid parameter 'filter'" in e.value.reason


# Test valid parameter
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.__init__",
    Mock(return_value=None),
)
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.get_argument",
    Mock(return_value="created"),
)
def test_listprhandler_param_valid():

    ListPullRequestsGithubUserHandler().validate_request()


# Test no PAT
@pytest.mark.asyncio
@patch("json.loads", Mock(return_value={"items": "test"}))
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=CoroutineMock)
async def test_getcurrentuser_pat_none(mock_fetch):

    mock_fetch.body.side_effect = [""]
    mock_fetch.return_value.code = 200

    with (pytest.raises(HTTPError)) as e:
        await get_current_user(None)

    assert e.value.status_code == 400
    assert "No Github access token specified" in e.value.reason

# Test empty PAT
@pytest.mark.asyncio
@patch("json.loads", Mock(return_value={"items": "test"}))
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=CoroutineMock)
async def test_getcurrentuser_pat_empty(mock_fetch):

    mock_fetch.body.side_effect = [""]
    mock_fetch.return_value.code = 200

    with (pytest.raises(HTTPError)) as e:
        await get_current_user("")

    assert e.value.status_code == 400
    assert "No Github access token specified" in e.value.reason


# Test invalid PAT
@pytest.mark.asyncio
@patch("json.loads", Mock(return_value={"items": "test"}))
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=CoroutineMock)
async def test_getcurrentuser_pat_invalid(mock_fetch):

    mock_fetch.body.side_effect = [""]
    mock_fetch.return_value.code = 200

    with (pytest.raises(HTTPError)) as e:
        await get_current_user("invalid")

    assert e.value.status_code == 400
    assert "Invalid Github access token specified" in e.value.reason


# Test valid PAT
@pytest.mark.asyncio
@patch("json.loads", Mock(return_value={"items": "test", "login":"username"}))
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=CoroutineMock)
async def test_getcurrentuser_pat_valid(mock_fetch):

    mock_fetch.body.side_effect = [""]
    mock_fetch.return_value.code = 200

    await get_current_user("valid")


# Test list_pr invalid response
@pytest.mark.asyncio
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.__init__",
    Mock(return_value=None),
)
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.get_argument",
    Mock(return_value="created"),
)
@patch("json.loads", Mock(return_value={}))
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=CoroutineMock)
async def test_listprhandler_listpr_invalid(mock_fetch):

    mock_fetch.body.side_effect = [""]
    mock_fetch.return_value.code = 200

    with (pytest.raises(HTTPError)) as e:
        await ListPullRequestsGithubUserHandler().list_prs(access_token="valid", current_user="username")

    assert e.value.status_code == 503
    assert "Received malformed Github response" in e.value.reason


# Test list_pr valid response
@pytest.mark.asyncio
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.__init__",
    Mock(return_value=None),
)
@patch(
    "jupyterlab_pullrequests.handlers.ListPullRequestsGithubUserHandler.get_argument",
    Mock(return_value="created"),
)
@patch("json.loads", Mock(return_value={"items": "test"}))
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=CoroutineMock)
async def test_listprhandler_list_pr_valid(mock_fetch):

    mock_fetch.body.side_effect = [""]
    mock_fetch.return_value.code = 200

    await ListPullRequestsGithubUserHandler().list_prs(access_token="valid", current_user="username")


# TODO test pagination
