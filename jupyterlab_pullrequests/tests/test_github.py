import json
import pathlib
from http import HTTPStatus

import pytest
from mock import AsyncMock, MagicMock, call, patch
from tornado.web import HTTPError

from jupyterlab_pullrequests.base import CommentReply, NewComment
from jupyterlab_pullrequests.managers.github import GitHubManager

HERE = pathlib.Path(__file__).parent.resolve()


def read_sample_response(filename):
    return MagicMock(
        body=(HERE / "sample_responses" / "github" / filename).read_bytes()
    )


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_user_pat_empty(mock_call_provider, pr_github_manager):
    with (pytest.raises(HTTPError)) as e:
        await pr_github_manager.get_current_user()
    assert e.value.status_code == HTTPStatus.BAD_REQUEST
    assert "No access token specified" in e.value.reason


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_user_pat_valid(mock_call_provider, pr_valid_github_manager):
    mock_call_provider.return_value = read_sample_response("github_current_user.json")

    result = await pr_valid_github_manager.get_current_user()

    assert result == {"username": "timnlupo"}


@pytest.mark.asyncio
@patch(
    "jupyterlab_pullrequests.managers.github.GitHubManager._call_github",
    new_callable=AsyncMock,
)
async def test_GitHubManager_list_prs_created(mock_call_provider, pr_valid_github_manager):
    await pr_valid_github_manager.list_prs("octocat", "created")

    mock_call_provider.assert_called_once_with(
        "https://api.github.com/search/issues?q=+state:open+type:pr+author:octocat",
    )


@pytest.mark.asyncio
@patch(
    "jupyterlab_pullrequests.managers.github.GitHubManager._call_github",
    new_callable=AsyncMock,
)
async def test_GitHubManager_list_prs_assigned(mock_call_provider, pr_valid_github_manager):
    await pr_valid_github_manager.list_prs("notoctocat", "assigned")

    mock_call_provider.assert_called_once_with(
        "https://api.github.com/search/issues?q=+state:open+type:pr+assignee:notoctocat",
    )


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_list_prs_result(mock_call_provider, pr_valid_github_manager):
    mock_call_provider.return_value = read_sample_response("github_list_prs.json")

    result = await pr_valid_github_manager.list_prs("octocat", "assigned")

    assert result == [
        {
            "id": "https://api.github.com/repos/timnlupo/juypterlabpr-test/pulls/1",
            "title": "Interesting PR for feature",
            "body": "This is a feature that tests a bunch of different types",
            "internalId": 457075994,
            "link": "https://github.com/timnlupo/juypterlabpr-test/pull/1",
        }
    ]


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_list_files_call(mock_call_provider, pr_valid_github_manager):
    mock_call_provider.return_value = read_sample_response("github_list_files.json")

    result = await pr_valid_github_manager.list_files(
        "https://api.github.com/repos/octocat/repo/pulls/1"
    )

    mock_call_provider.assert_called_once()
    assert (
        mock_call_provider.call_args[0][0].url
        == "https://api.github.com/repos/octocat/repo/pulls/1/files?per_page=100"
    )
    assert result == [{"name": "README.md", "status": "added"}]


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_get_file_diff(mock_call_provider, pr_valid_github_manager):
    mock_call_provider.side_effect = [
        read_sample_response("github_pr_links.json"),
        MagicMock(body=b"test code content"),
        MagicMock(body=b"test new code content"),
    ]
    result = await pr_valid_github_manager.get_file_diff("valid-prid", "valid-filename")
    assert mock_call_provider.call_count == 3
    assert result == {
        "base": {
            "label": "timnlupo:master",
            "sha": "a221b6d04be7fff0737c24e1e335a3091eca81e7",
            "content": "test code content",
        },
        "head": {
            "label": "timnlupo:dev",
            "sha": "02fb374e022fbe7aaa4cd69c0dc3928e6422dfaa",
            "content": "test new code content",
        },
    }


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_get_threads(mock_call_provider, pr_valid_github_manager):
    mock_call_provider.return_value = read_sample_response("github_comments_get.json")

    result = await pr_valid_github_manager.get_threads(
        "https://api.github.com/repos/octocat/repo/pulls/1", "test.ipynb"
    )

    mock_call_provider.assert_called_once()
    assert (
        mock_call_provider.call_args[0][0].url
        == "https://api.github.com/repos/octocat/repo/pulls/1/comments?per_page=100"
    )
    expected_result = [
        {
            "comments": [
                {
                    "id": 296364299,
                    "inReplyToId": None,
                    "text": "too boring",
                    "updatedAt": "2019-06-21T19:21:20Z",
                    "userName": "timnlupo",
                    "userPicture": "https://avatars1.githubusercontent.com/u/9003282?v=4",
                }
            ],
            "filename": "test.ipynb",
            "id": 296364299,
            "line": 9,
            "originalLine": None,
            "pullRequestId": "https://api.github.com/repos/octocat/repo/pulls/1",
        }
    ]
    assert result == expected_result


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_post_comment_valid_reply(mock_call_provider, pr_valid_github_manager):
    mock_call_provider.return_value = read_sample_response("github_comments_post.json")
    body = CommentReply("test text", "test.ipynb", 123)

    result = await pr_valid_github_manager.post_comment(
        "https://api.github.com/repos/octocat/repo/pulls/1", body
    )

    mock_call_provider.assert_called_once()
    request = mock_call_provider.call_args[0][0]
    assert (
        request.url == "https://api.github.com/repos/octocat/repo/pulls/1/comments",
    )
    assert json.loads(request.body.decode("utf-8")) == {
        "body": "test text",
        "in_reply_to": 123,
    }
    assert request.method == "POST"

    expected_result = {
        "id": 299659626,
        "text": "test",
        "updatedAt": "2019-07-02T19:58:38Z",
        "userName": "timnlupo",
        "userPicture": "https://avatars1.githubusercontent.com/u/9003282?v=4",
        "inReplyToId": 296364299,
    }
    assert result == expected_result


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitHubManager_post_comment_valid_new(mock_call_provider, pr_valid_github_manager):
    mock_call_provider.side_effect = [
        read_sample_response("github_pr_links.json"),
        read_sample_response("github_comments_post.json"),
    ]
    body = NewComment(
        text="test text", filename="test.ipynb", line=3, originalLine=None
    )

    result = await pr_valid_github_manager.post_comment(
        "https://api.github.com/repos/octocat/repo/pulls/1", body
    )

    expected_result = {
        "id": 299659626,
        "text": "test",
        "updatedAt": "2019-07-02T19:58:38Z",
        "userName": "timnlupo",
        "userPicture": "https://avatars1.githubusercontent.com/u/9003282?v=4",
        # FIXME use a different sample set without in_reply_to_id
        "inReplyToId": 296364299,
    }

    assert mock_call_provider.call_count == 2
    # 1 = 2nd call; 0 = args of call; 0 = first argument
    request = mock_call_provider.call_args_list[1][0][0]
    assert request.url == "https://api.github.com/repos/octocat/repo/pulls/1/comments"
    assert json.loads(request.body.decode("utf-8")) == {
        "body": "test text",
        "commit_id": "02fb374e022fbe7aaa4cd69c0dc3928e6422dfaa",
        "path": "test.ipynb",
        "line": 3,
        "side": "RIGHT",
    }
    assert request.method == "POST"
    assert result == expected_result


# TODO test pagination
