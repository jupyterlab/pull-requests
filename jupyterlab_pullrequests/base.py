from __future__ import annotations

from typing import NamedTuple

from traitlets import Enum, Unicode
from traitlets.config import Configurable


class PRCommentReply(NamedTuple):
    text: str
    inReplyTo: str


class PRCommentNew(NamedTuple):
    text: str
    commitId: str
    filename: str
    position: int


class PRConfig(Configurable):
    """
    Allows configuration of Github Personal Access Tokens via jupyter_notebook_config.py
    """

    access_token = Unicode(
        "",
        config=True,
        help="A personal access token to authenticated on the versioning service.",
    )

    api_base_url = Unicode(
        "https://api.github.com",
        config=True,
        help="Base URL of the versioning service REST API.",
    )

    platform = Enum(
        ["github", "gitlab"],
        default_value="github",
        config=True,
        help="The source control platform.",
    )
