import difflib
import json
import pathlib
from http import HTTPStatus

import pytest
from mock import AsyncMock, MagicMock, patch
from notebook.utils import url_path_join
from tornado.httpclient import HTTPClientError
from tornado.web import HTTPError

from jupyterlab_pullrequests.base import CommentReply, NewComment
from jupyterlab_pullrequests.managers.gitlab import GitLabManager

HERE = pathlib.Path(__file__).parent.resolve()


def read_sample_response(filename):
    return MagicMock(
        body=(HERE / "sample_responses" / "gitlab" / filename).read_bytes()
    )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "token, data, code",
    (
        ("valid", {"username": "jsmith"}, None),
        ("", "No access token specified", HTTPStatus.BAD_REQUEST),
    ),
)
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitLabManager_get_current_user(mock_call_provider, token, data, code, pr_gitlab_manger):
    mock_call_provider.return_value = read_sample_response("get_user.json")

    pr_gitlab_manger._config.access_token = token

    if code is None:
        result = await pr_gitlab_manger.get_current_user()
        assert result == data
    else:
        with pytest.raises(HTTPError) as e:
            await pr_gitlab_manger.get_current_user()
        assert e.value.status_code == code
        assert data in e.value.reason


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "user, filter, expected",
    (
        ("octocat", "created", "author_username=octocat"),
        ("octocat", "assigned", "scope=assigned_to_me"),
    ),
)
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitLabManager_list_prs(mock_call_provider, user, filter, expected, pr_valid_gitlab_manager):
    mock_call_provider.return_value = read_sample_response("get_prs.json")

    result = await pr_valid_gitlab_manager.list_prs(user, filter)

    mock_call_provider.assert_called_once()
    assert (
        mock_call_provider.call_args[0][0].url
        == f"{pr_valid_gitlab_manager.base_api_url}/merge_requests?state=opened&{expected}&per_page=100"
    )

    assert isinstance(result, list)
    for item in result:
        assert isinstance(item, dict)
        assert len(item) == 5
        assert isinstance(item["id"], str)
        assert isinstance(item["body"], str)
        assert isinstance(item["title"], str)
        assert isinstance(item["internalId"], int)
        assert isinstance(item["link"], str)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "user, filter, expected",
    (
        ("octocat", "created", "author_username=octocat"),
        ("octocat", "assigned", "scope=assigned_to_me"),
    ),
)
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitLabManager_list_files(mock_call_provider, user, filter, expected, pr_valid_gitlab_manager):
    mock_call_provider.return_value = read_sample_response("get_pr_changes.json")

    url = f"{pr_valid_gitlab_manager.base_api_url}/merge_requests/1"

    result = await pr_valid_gitlab_manager.list_files(url)
    mock_call_provider.assert_called_once()
    assert mock_call_provider.call_args[0][0].url == url_path_join(
        url, "changes?per_page=100"
    )

    assert isinstance(result, list)
    for item in result:
        assert isinstance(item, dict)
        assert len(item) == 2
        assert isinstance(item["name"], str)
        assert item["status"] in ("added", "modified", "removed", "renamed")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "change, status",
    (
        (
            {
                "old_path": "to_rename.py",
                "new_path": "renamed.py",
                "a_mode": "100644",
                "b_mode": "100644",
                "new_file": False,
                "renamed_file": True,
                "deleted_file": False,
                "diff": '@@ -1 +0,0 @@\n-""\n',
            },
            "renamed",
        ),
        (
            {
                "old_path": "file.py",
                "new_path": "file.py",
                "a_mode": "100644",
                "b_mode": "100644",
                "new_file": False,
                "renamed_file": False,
                "deleted_file": False,
                "diff": '@@ -1 +0,0 @@\n-""\n',
            },
            "modified",
        ),
        (
            {
                "old_path": "file.py",
                "new_path": "file.py",
                "a_mode": "100644",
                "b_mode": "100644",
                "new_file": True,
                "renamed_file": False,
                "deleted_file": False,
                "diff": '@@ -1 +0,0 @@\n-""\n',
            },
            "added",
        ),
        (
            {
                "old_path": "file.py",
                "new_path": "file.py",
                "a_mode": "100644",
                "b_mode": "0",
                "new_file": False,
                "renamed_file": False,
                "deleted_file": True,
                "diff": '@@ -1 +0,0 @@\n-""\n',
            },
            "removed",
        ),
    ),
)
@patch(
    "jupyterlab_pullrequests.managers.gitlab.GitLabManager._call_gitlab",
    new_callable=AsyncMock,
)
async def test_GitLabManager_list_files_status(mock_call_provider, change, status, pr_valid_gitlab_manager):
    mock_call_provider.return_value = [{"changes": [change]}]

    url = f"{pr_valid_gitlab_manager.base_api_url}/merge_requests/1"

    result = await pr_valid_gitlab_manager.list_files(url)
    assert result[0]["status"] == status


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "old_content, new_content",
    (
        (
            "test code content",
            "test new code content",
        ),
        (HTTPError(404), "test new code content"),
        ("test code content", HTTPError(404)),
    ),
)
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitLabManager_get_file_diff(
    mock_call_provider, old_content, new_content, pr_valid_gitlab_manager
):
    mock_call_provider.return_value = read_sample_response("get_pr_changes.json")

    mock_call_provider.side_effect = [
        read_sample_response("get_pr.json"),
        old_content
        if isinstance(old_content, Exception)
        else MagicMock(body=bytes(old_content, encoding="utf-8")),
        new_content
        if isinstance(new_content, Exception)
        else MagicMock(body=bytes(new_content, encoding="utf-8")),
    ]
    result = await pr_valid_gitlab_manager.get_file_diff("valid-prid", "valid-filename")
    assert mock_call_provider.call_count == 3
    assert result == {
        "base": {
            "label": "master",
            "sha": "e616d1a1a2a95416178b1494fa08a69694132c96",
            "content": old_content if isinstance(old_content, str) else "",
        },
        "head": {
            "label": "mr",
            "sha": "5cbd51cf3b89aaa1a2444cd4d4ce68fae299f592",
            "content": new_content if isinstance(new_content, str) else "",
        },
    }


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "filename, expected",
    (
        (
            "README.md",
            [
                {
                    "comments": [
                        {
                            "id": 48706,
                            "text": "Why did you remove it?",
                            "updatedAt": "2021-03-02T08:26:52.239Z",
                            "userName": "jsmith",
                            "userPicture": "https://gitlab.example.com/uploads/-/system/user/avatar/149/avatar.png",
                        },
                        {
                            "id": 48707,
                            "text": "I don't know",
                            "updatedAt": "2021-03-02T08:26:59.315Z",
                            "userName": "jsmith",
                            "userPicture": "https://gitlab.example.com/uploads/-/system/user/avatar/149/avatar.png",
                        },
                    ],
                    "filename": "README.md",
                    "id": "dd2fd2605c0a0351c10c04fe181af6c795e1290b",
                    "line": None,
                    "originalLine": 15,
                    "pullRequestId": "mergerequests-id",
                }
            ],
        ),
        (
            None,
            [
                {
                    "comments": [
                        {
                            "id": 48704,
                            "text": "Let's start a MR discussion",
                            "updatedAt": "2021-03-02T08:26:31.647Z",
                            "userName": "jsmith",
                            "userPicture": "https://gitlab.example.com/uploads/-/system/user/avatar/149/avatar.png",
                        },
                        {
                            "id": 48705,
                            "text": "I want to reply to myself",
                            "updatedAt": "2021-03-02T08:26:31.583Z",
                            "userName": "jsmith",
                            "userPicture": "https://gitlab.example.com/uploads/-/system/user/avatar/149/avatar.png",
                        },
                    ],
                    "filename": None,
                    "id": "98651e2c3a05155bde849c86389b9926c100ac90",
                    "line": None,
                    "originalLine": None,
                    "pullRequestId": "mergerequests-id",
                },
                {
                    "comments": [
                        {
                            "id": 49010,
                            "text": "changed the description",
                            "updatedAt": "2021-03-03T09:27:38.287Z",
                            "userName": "jsmith",
                            "userPicture": "https://gitlab.example.com/uploads/-/system/user/avatar/149/avatar.png",
                        },
                    ],
                    "filename": None,
                    "id": "207a944b264f4d644b98447e11e975c5b5ea6635",
                    "line": None,
                    "originalLine": None,
                    "pullRequestId": "mergerequests-id",
                },
            ],
        ),
    ),
)
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitLabManager_get_threads(mock_call_provider, filename, expected, pr_valid_gitlab_manager):
    mock_call_provider.return_value = read_sample_response("get_pr_comments.json")

    result = await pr_valid_gitlab_manager.get_threads("mergerequests-id", filename)

    mock_call_provider.assert_called_once()
    assert (
        mock_call_provider.call_args[0][0].url
        == f"{pr_valid_gitlab_manager.base_api_url}/mergerequests-id/discussions?per_page=100"
    )

    assert result == expected


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "filename, body, position, response, expected",
    (
        (
            None,
            NewComment("New discussion at merge request level", None, None, None),
            {"commit_id": "5cbd51cf3b89aaa1a2444cd4d4ce68fae299f592"},
            "posted_new_pr_comment.json",
            {
                "id": 49294,
                "text": "New discussion at merge request level",
                "updatedAt": "2021-03-05T09:37:26.241Z",
                "userName": "jsmith",
                "userPicture": "https://gitlab.example.com/uploads/-/system/user/avatar/149/avatar.png",
                "inReplyTo": "eca92cf74cfb9f4ad369cdadaa7209131bc1c648",
            },
        ),
        (
            None,
            CommentReply("Reply to a discussion at PR level", None, "discussion-id"),
            {},
            "posted_reply_pr_comment.json",
            {
                "id": 49151,
                "text": "Reply to a discussion at PR level",
                "updatedAt": "2021-03-04T13:49:00.526Z",
                "userName": "jsmith",
                "userPicture": "https://gitlab.example.com/uploads/-/system/user/avatar/149/avatar.png",
            },
        ),
        (
            "README.md",
            NewComment("New discussion on plain text", "README.md", 17, None),
            {
                "position": {
                    "position_type": "text",
                    "new_line": 17,
                    "new_path": "README.md",
                    "base_sha": "e616d1a1a2a95416178b1494fa08a69694132c96",
                    "head_sha": "5cbd51cf3b89aaa1a2444cd4d4ce68fae299f592",
                    "start_sha": "e616d1a1a2a95416178b1494fa08a69694132c96",
                }
            },
            "posted_new_file_comment.json",
            {
                "id": 49157,
                "text": "New discussion on plain text",
                "updatedAt": "2021-03-04T14:02:21.258Z",
                "userName": "jsmith",
                "userPicture": "https://gitlab.example.com/uploads/-/system/user/avatar/149/avatar.png",
                "inReplyTo": "7cd51262f86ad99f85f5a2ad30f76aeb39de7696",
            },
        ),
        (
            "README.md",
            CommentReply(
                "Reply to plain text discussion", "README.md", "discussion-id"
            ),
            {},
            "posted_reply_file_comment.json",
            {
                "id": 49154,
                "text": "Reply to plain text discussion",
                "updatedAt": "2021-03-04T13:49:49.499Z",
                "userName": "jsmith",
                "userPicture": "https://gitlab.example.com/uploads/-/system/user/avatar/149/avatar.png",
            },
        ),
    ),
)
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitLabManager_post_comment(
    mock_call_provider, filename, body, position, response, expected, pr_valid_gitlab_manager
):
    side_effect = [
        read_sample_response(response),
    ]
    if isinstance(body, NewComment):
        side_effect.insert(
            0,
            read_sample_response("get_pr.json"),
        )
    mock_call_provider.side_effect = side_effect

    result = await pr_valid_gitlab_manager.post_comment("mergerequest-id", body)

    assert mock_call_provider.call_count == len(side_effect)
    # 1 = last call; 0 = args of call; 0 = first argument
    request = mock_call_provider.call_args_list[-1][0][0]
    if isinstance(body, NewComment):
        assert request.url == f"{pr_valid_gitlab_manager.base_api_url}/mergerequest-id/discussions"
    else:
        assert (
            request.url
            == f"{pr_valid_gitlab_manager.base_api_url}/mergerequest-id/discussions/discussion-id/notes"
        )

    assert json.loads(request.body.decode("utf-8")) == {"body": body.text, **position}
    assert request.method == "POST"
    assert result == expected


@pytest.mark.asyncio
@patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=AsyncMock)
async def test_GitLabManager_post_comment_invalid_line_code(
    mock_call_provider, monkeypatch, pr_valid_gitlab_manager
):

    async def fake_file_diff(*args):
        # Fake that the 20 first lines are identical
        return [difflib.Match(a=0, b=0, size=20)]

    monkeypatch.setattr(pr_valid_gitlab_manager, "_get_file_diff", fake_file_diff)

    body = NewComment("New discussion on plain text", "README.md", 17, None)

    mock_call_provider.side_effect = [
        read_sample_response("get_pr.json"),
        HTTPClientError(
            HTTPStatus.BAD_REQUEST,
            None,
            MagicMock(
                body=bytes(
                    json.dumps({"message": 'line_code=>["must be a valid line code"]'}),
                    encoding="utf-8",
                )
            ),
        ),
        read_sample_response("posted_new_file_comment.json"),
    ]

    result = await pr_valid_gitlab_manager.post_comment("mergerequest-id", body)

    assert mock_call_provider.call_count == 3
    # 1 = last call; 0 = args of call; 0 = first argument
    request = mock_call_provider.call_args_list[-1][0][0]

    assert request.url == f"{pr_valid_gitlab_manager.base_api_url}/mergerequest-id/discussions"
    assert json.loads(request.body.decode("utf-8")) == {
        "body": body.text,
        "position": {
            "position_type": "text",
            "new_line": 17,
            "old_line": 17,
            "new_path": "README.md",
            "old_path": None,
            "base_sha": "e616d1a1a2a95416178b1494fa08a69694132c96",
            "head_sha": "5cbd51cf3b89aaa1a2444cd4d4ce68fae299f592",
            "start_sha": "e616d1a1a2a95416178b1494fa08a69694132c96",
        },
    }
    assert request.method == "POST"
    assert result == {
        "id": 49157,
        "text": "New discussion on plain text",
        "updatedAt": "2021-03-04T14:02:21.258Z",
        "userName": "jsmith",
        "userPicture": "https://gitlab.example.com/uploads/-/system/user/avatar/149/avatar.png",
        "inReplyTo": "7cd51262f86ad99f85f5a2ad30f76aeb39de7696",
    }
