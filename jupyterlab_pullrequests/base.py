from typing import List, NamedTuple, Optional

from traitlets import Enum, Unicode, default, Bool
from traitlets.config import Configurable


class CommentReply(NamedTuple):
    """Comment reply

    Attributes:
        text: Comment body
        filename: Targeted filename; None if the comment is for the pull request
        inReplyTo: ID of the comment of the discussion or the comment to which this one reply
    """

    text: str
    filename: Optional[str]
    inReplyTo: str


class NewComment(NamedTuple):
    """New comment

    Attributes:
        text: Comment body
        filename: Targeted filename; None if the comment is for the pull request
        line: Commented line number (in the new version)
        originalLine: Commented line number (in the original version)
    """

    text: str
    filename: Optional[str]
    line: Optional[int]
    originalLine: Optional[int]


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

    anonymous = Bool(
        config=True,
        default=False,
        help="Whether API request should be made without authorization headers",
    )

    repo = Unicode(
        config=True,
        allow_none=True,
        help="An optional repo name to seed PR listing, used by github-anonymous"
    )

    owner = Unicode(
        config=True,
        allow_none=True,
        help="An option user/organization to seed PR listing, used by github-anonymous"
    )

    @default("api_base_url")
    def set_default_api_base_url(self):
        if self.provider == "gitlab":
            return "https://gitlab.com/api/v4/"
        else:
            return "https://api.github.com"

    provider = Enum(
        ["github", "github-anonymous", "gitlab"],
        default_value="github",
        config=True,
        help="The source control provider.",
    )
