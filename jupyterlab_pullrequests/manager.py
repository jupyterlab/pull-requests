import tornado.gen as gen
from tornado.httpclient import AsyncHTTPClient


class PullRequestsManager():

    def __init__(self, access_token):
        self.client = AsyncHTTPClient()
        self.access_token = access_token

    @gen.coroutine
    def get_current_user(self):
        raise NotImplementedError()

    @gen.coroutine
    def list_prs(self, username, pr_filter):
        raise NotImplementedError()

    @gen.coroutine
    def list_files(self, pr_id):
        raise NotImplementedError()

    @gen.coroutine
    def get_file_content(self, pr_id, filename):
        raise NotImplementedError()

    @gen.coroutine
    def get_file_comments(self, pr_id, filename):
        raise NotImplementedError()

    @gen.coroutine
    def post_file_comment(self, pr_id, filename, body):
        raise NotImplementedError()
