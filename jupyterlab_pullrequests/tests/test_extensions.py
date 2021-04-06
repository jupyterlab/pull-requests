from tornado.web import Application

from .. import (
    _jupyter_labextension_paths,
    _jupyter_server_extension_points,
    _load_jupyter_server_extension,
)


def test_labextension():
    assert len(_jupyter_labextension_paths()) == 1


def test_server_extension():
    assert len(_jupyter_server_extension_points()) == 1


def test_load_extension(jp_serverapp):
    _load_jupyter_server_extension(jp_serverapp)
