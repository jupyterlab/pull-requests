from .github import GitHubManager

from typing import List, Dict

from notebook.utils import url_path_join


class AnonymousGithubManager(GitHubManager):
    """work-in-progress best-effort anonymous github manager

    Without guidance, this manager will rapidly exhaust the free API limit,
    so may best be configured for per-PR views
    """

    @property
    def anonymous(self) -> bool:
        """Whether the provider should use Authorization headers"""
        return False


    async def get_current_user(self) -> Dict[str, str]:
        """Get the current user information.

        Returns:
            JSON description of the user matching the access token
        """
        return {"username": "anonymous"}

    async def list_prs(self, username: str, pr_filter: str) -> List[Dict[str, str]]:
        """Returns the list of pull requests for the given user.

        TODO: figure out more sane handling
        state: all|(open? closed? green?)

        Args:
            username: User ID for the versioning service
            pr_filter: Filter to add to the pull requests requests
        Returns:
            The list of pull requests
        """
        # use the Repos API to fetch some PRs
        git_url = url_path_join(
            self.base_api_url,
            "repos",
            self._config.owner,
            self._config.repo,
            "pulls"
        )

        results = await self._call_github(
            git_url,
            params=dict(state="all", per_page=100),
            has_pagination=False
        )

        self._pull_requests_cache = {result["id"]: result for result in results}

        return [
            {
                "id": result["url"],
                "title": result["title"],
                "body": result["body"],
                "internalId": result["id"],
                "link": result["html_url"],
            }
            for result in results
        ]
