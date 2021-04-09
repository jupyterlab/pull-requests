import json
import pathlib
from http import HTTPStatus

import pytest
from mock import AsyncMock, MagicMock, patch
from tornado.httpclient import HTTPClientError
from tornado.web import HTTPError

from jupyterlab_pullrequests.managers.github import GitHubManager

HERE = pathlib.Path(__file__).parent.resolve()


def read_sample_response(filename):
    return MagicMock(
        body=(HERE / "sample_responses" / "github" / filename).read_bytes()
    )


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_call_provider_bad_gitresponse(mock_fetch, pr_valid_github_manager):
    mock_fetch.side_effect = HTTPClientError(code=404)

    with pytest.raises(HTTPError) as e:
        await pr_valid_github_manager._call_provider("invalid-link")

    assert e.value.status_code == 404
    assert "Invalid response in" in e.value.reason


@pytest.mark.asyncio
@patch("json.loads", MagicMock(side_effect=json.JSONDecodeError("", "", 0)))
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_call_provider_bad_parse(mock_fetch, pr_valid_github_manager):
    mock_fetch.return_value = MagicMock(headers={})

    with (pytest.raises(HTTPError)) as e:
        await pr_valid_github_manager._call_provider("invalid-link")

    assert e.value.status_code == HTTPStatus.BAD_REQUEST
    assert "Invalid response in" in e.value.reason


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_call_provider_bad_unknown(mock_fetch, pr_valid_github_manager):
    mock_fetch.side_effect = Exception()

    with (pytest.raises(HTTPError)) as e:
        await pr_valid_github_manager._call_provider("invalid-link")

    assert e.value.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert "Unknown error in" in e.value.reason


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_call_provider_valid(mock_fetch, pr_valid_github_manager):
    mock_fetch.return_value = MagicMock(body=b'{"test1": "test2"}')
    result = await pr_valid_github_manager._call_provider("valid-link")
    assert result[0]["test1"] == "test2"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "link, expected",
    (
        ({"Link": '<next-url>; rel="next"'}, 2),
        ({"Link": '<next-url>; rel="first"'}, 1),
        ({"Link": '<next-url>; meta="next"'}, 1),
        ({}, 1),
    ),
)
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_call_provider_pagination(mock_fetch, link, expected, pr_valid_github_manager):
    expected_data = [{"name": "first"}, {"name": "second"}, {"name": "third"}]
    mock_fetch.side_effect = [
        MagicMock(body=b'[{"name":"first"},{"name":"second"}]', headers=link),
        MagicMock(body=b'[{"name":"third"}]', headers={}),
    ]

    result = await pr_valid_github_manager._call_provider("valid-link")

    assert mock_fetch.await_count == expected
    assert mock_fetch.await_args_list[0][0][0].url.endswith("?per_page=100")
    if expected == 2:
        assert (
            mock_fetch.await_args_list[1][0][0].url
            == f"{pr_valid_github_manager.base_api_url}/next-url"
        )
    assert result == expected_data[: (expected + 1)]


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_call_provider_pagination_dict(mock_fetch, pr_valid_github_manager):
    """Check that paginated endpoint returning dictionary got aggregated in a list"""
    expected_data = [{"name": "first"}, {"name": "second"}]
    mock_fetch.side_effect = [
        MagicMock(body=b'{"name":"first"}', headers={"Link": '<next-url>; rel="next"'}),
        MagicMock(body=b'{"name":"second"}', headers={}),
    ]

    result = await pr_valid_github_manager._call_provider("valid-link")

    assert result == expected_data
