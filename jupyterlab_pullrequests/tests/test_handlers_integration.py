import sys
from unittest.mock import patch

import pytest
import tornado

valid_prid = "https://api.github.com/repos/timnlupo/juypterlabpr-test/pulls/1"
valid_prfilename = "test.ipynb"


@pytest.mark.flaky
@patch("jupyterlab_pullrequests.base.PRConfig.access_token", "")
async def test_ListPullRequests_pat_empty(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"No access token specified"
    ) as exc_info:
        await jp_fetch("pullrequests", "prs", "user", params={"filter": "created"})
    assert exc_info.value.code == 400


@patch("jupyterlab_pullrequests.base.PRConfig.access_token", "invalid")
async def test_ListPullRequests_pat_invalid(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid response in"
    ) as exc_info:
        await jp_fetch("pullrequests", "prs", "user", params={"filter": "created"})
    assert exc_info.value.code == 401


# Test list pull requests params

# Test missing parameter
async def test_ListPullRequests_param_missing(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Missing argument 'filter'"
    ) as exc_info:
        await jp_fetch("pullrequests", "prs", "user")
    assert exc_info.value.code == 400


# Test no parameter
async def test_ListPullRequests_param_none(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid argument 'filter'"
    ) as exc_info:
        await jp_fetch("pullrequests", "prs", "user", params={"filter": ""})
    assert exc_info.value.code == 400


# Test invalid parameter
async def test_ListPullRequests_param_invalid(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid parameter 'filter'"
    ) as exc_info:
        await jp_fetch("pullrequests", "prs", "user", params={"filter": "invalid"})
    assert exc_info.value.code == 400


# Test list files

# Test missing id
async def test_ListPullRequests_id_missing(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Missing argument 'id'"
    ) as exc_info:
        await jp_fetch("pullrequests", "prs", "files")
    assert exc_info.value.code == 400


# Test no id
async def test_ListPullRequests_id_none(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid argument 'id'"
    ) as exc_info:
        await jp_fetch("pullrequests", "prs", "files", params={"id": ""})
    assert exc_info.value.code == 400


# Test invalid id
@patch("jupyterlab_pullrequests.base.PRConfig.api_base_url", "")
async def test_ListPullRequests_id_invalid(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid response"
    ) as exc_info:
        await jp_fetch(
            "pullrequests", "prs", "files", params={"id": "https://google.com"}
        )
    assert exc_info.value.code >= 400


# Test get file links

# Test missing id
async def test_GetPullRequests_id_missing(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Missing argument 'id'"
    ) as exc_info:
        await jp_fetch(
            "pullrequests", "files", "content", params={"filename": valid_prfilename}
        )
    assert exc_info.value.code == 400


# Test no id
async def test_GetPullRequests_id_none(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid argument 'id'"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "content",
            params={"filename": valid_prfilename, "id": ""},
        )
    assert exc_info.value.code == 400


# Test missing id
async def test_GetPullRequests_filename_missing(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Missing argument 'filename'"
    ) as exc_info:
        await jp_fetch("pullrequests", "files", "content", params={"id": valid_prid})
    assert exc_info.value.code == 400


# Test no id
async def test_GetPullRequests_filename_none(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid argument 'filename'"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "content",
            params={"id": valid_prid, "filename": ""},
        )
    assert exc_info.value.code == 400


# Test invalid id
@patch("jupyterlab_pullrequests.base.PRConfig.api_base_url", "")
async def test_GetFiles_id_invalid(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid response"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "content",
            params={"filename": valid_prfilename, "id": "https://google.com"},
        )
    assert exc_info.value.code >= 400


# Test get PR comments

# Test missing id
async def test_comments_id_missing(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Missing argument 'id'"
    ) as exc_info:
        await jp_fetch(
            "pullrequests", "files", "comments", params={"filename": valid_prfilename}
        )
    assert exc_info.value.code >= 400


# Test no id
async def test_comments_id_none(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid argument 'id'"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "comments",
            params={"filename": valid_prfilename, "id": ""},
        )
    assert exc_info.value.code == 400


# Test invalid id
@patch("jupyterlab_pullrequests.base.PRConfig.api_base_url", "")
async def test_comments_id_invalid(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid response"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "comments",
            params={"filename": valid_prfilename, "id": "https://google.com"},
        )
    assert exc_info.value.code >= 400


# Test get PR comments

# Test missing id
async def test_post_comments_id_missing(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Missing argument 'id'"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "comments",
            params={"filename": valid_prfilename},
            method="POST",
            body="{}",
        )
    assert exc_info.value.code == 400


# Test no id
async def test_post_comment_id_none(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid argument 'id'"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "comments",
            params={"filename": valid_prfilename, "id": ""},
            method="POST",
            body="{}",
        )
    assert exc_info.value.code == 400


# Test empty body
async def test_post_comment_body_empty(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid POST body"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "comments",
            params={"id": valid_prid, "filename": valid_prfilename},
            method="POST",
            body="",
        )
    assert exc_info.value.code == 400


# Test invalid body JSON
async def test_post_comment_body_invalid(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid POST body"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "comments",
            params={"id": valid_prid, "filename": valid_prfilename},
            method="POST",
            body="{)",
        )
    assert exc_info.value.code == 400


# Test invalid body JSON
async def test_post_comment_body_missingkey(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Missing POST key"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "comments",
            params={"id": valid_prid, "filename": valid_prfilename},
            method="POST",
            body='{"discussionId": 123, "tex": "test"}',
        )
    assert exc_info.value.code == 400


# Test invalid id
@patch("jupyterlab_pullrequests.base.PRConfig.api_base_url", "")
async def test_post_comment_id_invalid(jp_fetch):
    with pytest.raises(
        tornado.httpclient.HTTPClientError, match=r"Invalid response"
    ) as exc_info:
        await jp_fetch(
            "pullrequests",
            "files",
            "comments",
            params={"filename": valid_prfilename, "id": "https://google.com"},
            method="POST",
            body='{"in_reply_to": 123, "text": "test"}',
        )
    assert exc_info.value.code >= 400
