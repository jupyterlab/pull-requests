import json

import nbformat
import tornado.gen as gen
from nbdime import diff_notebooks
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

    @gen.coroutine
    def get_file_nbdiff(self, base_content, remote_content):
        try:
            base_nb = nbformat.reads(base_content, as_version=4)
            remote_nb = nbformat.reads(remote_content, as_version=4)
            thediff = diff_notebooks(base_nb, remote_nb)
        except:
            raise
        data = { 'base': base_nb, 'diff': thediff }
        return data
