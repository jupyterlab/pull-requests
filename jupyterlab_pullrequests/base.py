from __future__ import annotations

from dataclasses import dataclass
from typing import List, NamedTuple, Optional

from traitlets import Enum, Unicode, default
from traitlets.config import Configurable


class CommentReply(NamedTuple):
    text: str
    inReplyTo: str


class NewComment(NamedTuple):
    text: str
    commitId: str
    filename: Optional[str]
    position: Optional[int]


# @dataclass
# class Comment:
#     id: str
#     text: str
#     updatedAt: str
#     userName: str
#     userPicture: str


# @dataclass
# class Discussion:
#     id: str
#     comments: List[Comment]
#     lineNumber: Optional[int] = None


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
        config=True,
        help="Base URL of the versioning service REST API.",
    )

    @default('api_base_url')
    def set_default_api_base_url(self):
        if self.platform == "gitlab":
            return "https://gitlab.com/api/v4/"
        else:
            return "https://api.github.com"

    platform = Enum(
        ["github", "gitlab"],
        default_value="github",
        config=True,
        help="The source control platform.",
    )
