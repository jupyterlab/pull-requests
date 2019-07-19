import json
from collections import namedtuple
from http import HTTPStatus

import pytest
from asynctest import CoroutineMock, MagicMock, Mock, TestCase, call, patch
from jupyterlab_pullrequests.github_manager import PullRequestsGithubManager
from tornado.httpclient import (AsyncHTTPClient, HTTPClientError, HTTPRequest,
                                HTTPResponse)
from tornado.web import HTTPError, MissingArgumentError

import test_config

client = AsyncHTTPClient()

# test_config.py redacted for security
# contains valid_access_token str with valid Github personal access token
valid_access_token = test_config.valid_access_token
valid_manager = PullRequestsGithubManager(valid_access_token)

# -----------------------------------------------------------------------------
# /pullrequests/prs/user Handler Tests
# -----------------------------------------------------------------------------

def read_sample_response(filename):
    with open(f'sample_responses/{filename}') as json_data:
        return json.load(json_data,) 

@pytest.mark.asyncio
class TestGetCurrentUser(TestCase):

    async def test_pat_none(self):
        manager = PullRequestsGithubManager(None)
        with (pytest.raises(HTTPError)) as e:
            await manager.get_current_user()
        assert e.value.status_code == HTTPStatus.BAD_REQUEST
        assert "No Github access token specified" in e.value.reason

    async def test_pat_empty(self):
        manager = PullRequestsGithubManager("")
        with (pytest.raises(HTTPError)) as e:
            await manager.get_current_user()
        assert e.value.status_code == HTTPStatus.BAD_REQUEST
        assert "No Github access token specified" in e.value.reason
    
    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.call_github", new_callable=CoroutineMock)
    async def test_pat_valid(self, mock_call_github):
        manager = PullRequestsGithubManager("valid-pat")
        mock_call_github.return_value = read_sample_response('github_current_user.json')
        result = await manager.get_current_user()
        assert result == { 'username': 'timnlupo' }

@pytest.mark.asyncio
class TestListPRs(TestCase):
    
    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.call_github", new_callable=CoroutineMock)
    async def test_created(self, mock_call_github):
        manager = PullRequestsGithubManager("valid-pat")
        await manager.list_prs("octocat", "created")
        mock_call_github.assert_called_with('https://api.github.com/search/issues?q=+state:open+type:pr+author:octocat')

    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.call_github", new_callable=CoroutineMock)
    async def test_assigned(self, mock_call_github):
        manager = PullRequestsGithubManager("valid-pat")
        await manager.list_prs("notoctocat", "assigned")
        mock_call_github.assert_called_with('https://api.github.com/search/issues?q=+state:open+type:pr+assignee:notoctocat')

    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.call_github", new_callable=CoroutineMock)
    async def test_result(self, mock_call_github):
        manager = PullRequestsGithubManager("valid-pat")
        mock_call_github.return_value = read_sample_response('github_list_prs.json')
        result =  await manager.list_prs("octocat", "assigned")
        assert result == [{
            'id': 'https://api.github.com/repos/timnlupo/juypterlabpr-test/pulls/1', 
            'title': 'Interesting PR for feature', 
            'body': 'This is a feature that tests a bunch of different types', 
            'internal_id': 457075994,
            'url': 'https://github.com/timnlupo/juypterlabpr-test/pull/1'
        }]

# -----------------------------------------------------------------------------
# /pullrequests/prs/files Handler
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
class TestListFiles(TestCase):
    
    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.call_github", new_callable=CoroutineMock)
    async def test_call(self, mock_call_github):
        manager = PullRequestsGithubManager("valid-pat")
        mock_call_github.return_value = read_sample_response('github_list_files.json')
        result = await manager.list_files("https://api.github.com/repos/octocat/repo/pulls/1")
        mock_call_github.assert_called_with('https://api.github.com/repos/octocat/repo/pulls/1/files')
        assert result == [{'name': 'README.md', 'status': 'added', 'additions': 1, 'deletions': 0}]
    
# -----------------------------------------------------------------------------
# /pullrequests/files/content Handler
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
class TestGetFileContent(TestCase):

    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.call_github", new_callable=CoroutineMock)
    @pytest.mark.asyncio
    async def test_get_file_content(self, mock_call_github):
        manager = PullRequestsGithubManager("valid-pat")
        mock_call_github.side_effect = [
            read_sample_response('github_pr_links.json'),
            read_sample_response('github_validate_pr_link.json'),
            read_sample_response('github_validate_pr_link.json'),
            'test code content',
            'test new code content'
        ]
        result = await manager.get_file_content("valid-prid", "valid-filename")
        assert mock_call_github.call_count == 5
        assert result == {'base_content': 'test code content', 'head_content': 'test new code content', 'commit_id': '02fb374e022fbe7aaa4cd69c0dc3928e6422dfaa' }


    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.get_link_content", new_callable=CoroutineMock)
    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.validate_pr_link", new_callable=CoroutineMock)
    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.get_pr_links", new_callable=CoroutineMock)
    @pytest.mark.asyncio
    async def test_get_file_content_calls(self, mock_get_pr_links, mock_validate_pr_link, mock_get_single_content):
        manager = PullRequestsGithubManager("valid-pat")
        mock_get_pr_links.return_value = {'base_url':'http://base_url.com', 'head_url':'http://head_url.com', 'commit_id':'123sha'}
        mock_validate_pr_link.side_effect = ['http://base_url_download.com', 'http://head_url_download.com']
        mock_get_single_content.side_effect = ['base content', 'head content']
        result = await manager.get_file_content("valid-prid", "valid-filename")
        mock_get_pr_links.assert_called_once_with("valid-prid", "valid-filename")
        assert mock_validate_pr_link.call_count == 2
        mock_validate_pr_link.assert_has_calls([call("http://base_url.com"), call("http://head_url.com")], any_order=True)
        assert mock_get_single_content.call_count == 2
        mock_get_single_content.assert_has_calls([call("http://base_url_download.com"), call("http://head_url_download.com")], any_order=True)
        assert result == {'base_content': 'base content', 'head_content': 'head content', 'commit_id': '123sha'}

# -----------------------------------------------------------------------------
# /pullrequests/files/comments Handler
# -----------------------------------------------------------------------------

class TestGetFileComments(TestCase):

    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.call_github", new_callable=CoroutineMock)
    async def test_call(self, mock_call_github):
        manager = PullRequestsGithubManager("valid-pat")
        mock_call_github.return_value = read_sample_response('github_comments_get.json')
        result = await manager.get_file_comments("https://api.github.com/repos/octocat/repo/pulls/1", "test.ipynb")
        mock_call_github.assert_called_with('https://api.github.com/repos/octocat/repo/pulls/1/comments')
        expected_result = [{  
            "id":296364299,
            "line_number":9,
            "text":"too boring",
            "updated_at": "2019-06-21T19:21:20Z",
            "user_name":"timnlupo",
            "user_pic":"https://avatars1.githubusercontent.com/u/9003282?v=4"
        }]
        assert result == expected_result

class TestPostFileComments(TestCase):

    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.call_github", new_callable=CoroutineMock)
    async def test_valid_reply(self, mock_call_github):
        manager = PullRequestsGithubManager("valid-pat")
        mock_call_github.return_value = read_sample_response('github_comments_post.json')
        PRCommentReply = namedtuple("PRCommentReply", ["text", "in_reply_to"])
        body = PRCommentReply("test text", 123)
        result = await manager.post_file_comment("https://api.github.com/repos/octocat/repo/pulls/1", "test.ipynb", body)
        expected_result = {
            'id': 299659626,
            'line_number': 9,
            'text': 'test',
            'updated_at': '2019-07-02T19:58:38Z',
            'user_name': 'timnlupo',
            'user_pic': 'https://avatars1.githubusercontent.com/u/9003282?v=4',
            'in_reply_to_id': 296364299
        }
        mock_call_github.assert_called_with(
            'https://api.github.com/repos/octocat/repo/pulls/1/comments',
            body={'body': 'test text', 'in_reply_to': 123},
            method='POST'
        )
        assert result == expected_result

    @patch("jupyterlab_pullrequests.github_manager.PullRequestsGithubManager.call_github", new_callable=CoroutineMock)
    async def test_valid_new(self, mock_call_github):
        manager = PullRequestsGithubManager("valid-pat")
        mock_call_github.return_value = read_sample_response('github_comments_post.json')
        PRCommentNew = namedtuple("PRCommentNew", ["text", "commit_id", "filename", "position"])
        body = PRCommentNew("test text", 123, "test.ipynb", 3)
        result = await manager.post_file_comment("https://api.github.com/repos/octocat/repo/pulls/1", "test.ipynb", body)
        expected_result = {
            'id': 299659626,
            'line_number': 9,
            'text': 'test',
            'updated_at': '2019-07-02T19:58:38Z',
            'user_name': 'timnlupo',
            'user_pic': 'https://avatars1.githubusercontent.com/u/9003282?v=4',
            'in_reply_to_id': 296364299
        }
        mock_call_github.assert_called_with(
            'https://api.github.com/repos/octocat/repo/pulls/1/comments',
            body={'body': 'test text', 'commit_id': 123, 'path': 'test.ipynb', 'position': 3},
            method='POST'
        )
        assert result == expected_result

# -----------------------------------------------------------------------------
# /pullrequests/files/nbdiff Handler
# -----------------------------------------------------------------------------

class TestPostFileNBDiff(TestCase):

    async def test_valid(self):
        manager = PullRequestsGithubManager("valid-pat")
        prev_content = json.dumps(read_sample_response("ipynb_base.json"))
        curr_content = json.dumps(read_sample_response("ipynb_remote.json"))
        result = await manager.get_file_nbdiff(prev_content, curr_content)
        expected_result = read_sample_response("ipynb_nbdiff.json")
        assert result == expected_result

# -----------------------------------------------------------------------------
# Github Utilities
# -----------------------------------------------------------------------------

@pytest.mark.asyncio
class TestCallGithub(TestCase):

    @patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=CoroutineMock)
    async def test_bad_gitresponse(self, mock_fetch):
        manager = PullRequestsGithubManager("valid-pat")
        mock_fetch.side_effect = HTTPClientError(code=404)
        with (pytest.raises(HTTPError)) as e:
            await manager.call_github("invalid-link")
        assert e.value.status_code == 404
        assert "Invalid response in" in e.value.reason

    @patch("json.loads", Mock(side_effect=ValueError()))
    @patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=CoroutineMock)
    async def test_bad_parse(self, mock_fetch):
        manager = PullRequestsGithubManager("valid-pat")
        with (pytest.raises(HTTPError)) as e:
            await manager.call_github("invalid-link")
        assert e.value.status_code == HTTPStatus.BAD_REQUEST
        assert "Invalid response in" in e.value.reason

    @patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=CoroutineMock)
    async def test_bad_unknown(self, mock_fetch):
        manager = PullRequestsGithubManager("valid-pat")
        mock_fetch.side_effect = Exception()
        with (pytest.raises(HTTPError)) as e:
            await manager.call_github("invalid-link")
        assert e.value.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert "Unknown error in" in e.value.reason

    @patch("json.loads", Mock(return_value={"test1": "test2"}))
    @patch("tornado.httpclient.AsyncHTTPClient.fetch", new_callable=CoroutineMock)
    async def test_valid(self, mock_fetch):
        manager = PullRequestsGithubManager("valid-pat")
        result = await manager.call_github("valid-link")
        assert result["test1"] == "test2"


# TODO test pagination
