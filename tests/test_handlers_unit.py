import pytest
from asynctest import CoroutineMock, MagicMock, Mock, call, patch
from jupyterlab_pullrequests.base import HTTPError
from jupyterlab_pullrequests.handlers import (
    ListPullRequestsGithubUserHandler, get_current_user, list_prs)
from tornado.httpclient import AsyncHTTPClient, HTTPClientError, HTTPRequest
from tornado.web import MissingArgumentError

import test_config

client = AsyncHTTPClient()

# test_config.py redacted for security
# contains valid_access_token str with valid Github personal access token
valid_access_token = test_config.valid_access_token

# LIST PR HANDLER: Test no PAT
@pytest.mark.asyncio
async def test_getcurrentuser_pat_none():

    with (pytest.raises(HTTPError)) as e:
        await get_current_user(None)

    assert e.value.status_code == 400
    assert "No Github access token specified" in e.value.reason

# LIST PR HANDLER: Test empty PAT
@pytest.mark.asyncio
async def test_getcurrentuser_pat_empty():

    with (pytest.raises(HTTPError)) as e:
        await get_current_user(client=client, access_token="")

    assert e.value.status_code == 400
    assert "No Github access token specified" in e.value.reason

# LIST PR HANDLER: Test invalid PAT
@pytest.mark.asyncio
async def test_getcurrentuser_pat_invalid():

    with (pytest.raises(HTTPError)) as e:
        await get_current_user(client=client, access_token="invalid")

    assert e.value.status_code == 401
    assert "Invalid Github access token specified" in e.value.reason

# LIST PR HANDLER: Test valid PAT
@pytest.mark.asyncio
async def test_getcurrentuser_pat_valid():

    response = await get_current_user(client=client, access_token=valid_access_token)
    assert (response == 'timnlupo')


# LIST PR HANDLER: Test list_pr valid response
@pytest.mark.asyncio
async def test_listprhandler_list_pr_valid():

    response = await list_prs(client=client, access_token=valid_access_token, search_filter="+author:octocat")
    assert (response[0]['user']['login'] == 'octocat')

# TODO test pagination
