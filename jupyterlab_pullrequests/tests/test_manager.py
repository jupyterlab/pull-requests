import json
import pathlib
from http import HTTPStatus
from mock import AsyncMock, MagicMock, patch

import pytest
from tornado.httpclient import HTTPClientError
from tornado.web import HTTPError

from jupyterlab_pullrequests.managers.github import GitHubManager

HERE = pathlib.Path(__file__).parent.resolve()


def read_sample_response(filename):
    return MagicMock(
        body=(HERE / "sample_responses" / "github" / filename).read_bytes()
    )


@pytest.mark.asyncio
async def test_GitHubManager_get_file_nbdiff():
    manager = GitHubManager(access_token="valid")
    prev_content = (
        HERE / "sample_responses" / "github" / "ipynb_base.json"
    ).read_text()
    curr_content = (
        HERE / "sample_responses" / "github" / "ipynb_remote.json"
    ).read_text()

    result = await manager.get_file_nbdiff(prev_content, curr_content)

    expected_result = json.loads(
        (HERE / "sample_responses" / "github" / "ipynb_nbdiff.json").read_text()
    )
    assert result == expected_result


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_call_provider_bad_gitresponse(mock_fetch):
    manager = GitHubManager(access_token="valid")
    mock_fetch.side_effect = HTTPClientError(code=404)

    with pytest.raises(HTTPError) as e:
        await manager._call_provider("invalid-link")

    assert e.value.status_code == 404
    assert "Invalid response in" in e.value.reason


@pytest.mark.asyncio
@patch("json.loads", MagicMock(side_effect=json.JSONDecodeError("", "", 0)))
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_call_provider_bad_parse(mock_fetch):
    manager = GitHubManager(access_token="valid")

    with (pytest.raises(HTTPError)) as e:
        await manager._call_provider("invalid-link")

    assert e.value.status_code == HTTPStatus.BAD_REQUEST
    assert "Invalid response in" in e.value.reason


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_call_provider_bad_unknown(mock_fetch):
    manager = GitHubManager(access_token="valid")
    mock_fetch.side_effect = Exception()

    with (pytest.raises(HTTPError)) as e:
        await manager._call_provider("invalid-link")

    assert e.value.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "Unknown error in" in e.value.reason


@pytest.mark.asyncio
@patch("json.loads", MagicMock(return_value={"test1": "test2"}))
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_call_provider_valid(mock_fetch):
    manager = GitHubManager(access_token="valid")
    result = await manager._call_provider("valid-link")
    assert result["test1"] == "test2"
