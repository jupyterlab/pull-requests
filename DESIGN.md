## Concerns About Current Design

1) Requires two API calls to list user's PR
    * First API call retrieves username from given access token, second call takes retrieved username and uses it to search that user's PRs
    * Should we cache username in the config file to skip the first step? What if user changes username? Are the risks of an outdated username worth the saved overhead of an extra API call?
2) Requires separate calls API calls to retrieve PRs created by user, assigned by user.
    * Is it better to call all at once and add labels/tags to differentiate? Or to require two separate calls? Which has more overhead?

## Notes re Listing a Github User's PRs

The Github REST API v3 has some quirks when it comes to pull requests. See below for a discussion on the three main options to explain my design choices.

### 1) [List Pull Requests](https://developer.github.com/v3/pulls/)

`GET /repos/:owner/:repo/pulls`

* Pros
    * Requires a single API call
    * Lists PR details without further calls
    * Lists private PRs
* Cons
    * Only returns the PRs of a single `:owner/:repo`

**Conclusion:** I did not use this endpoint because it lists PRs from repos, not from users

### 2) [List All Issues](https://developer.github.com/v3/issues/), then only return PRs

`GET /issues`

* Pros
    * Lists issues from authenticated user
    * Includes owned repos, member repos, and organization repos
    * Lists private issues
* Cons
    * Does not return issues/PRs for repos that you do not own or are not a part of (eg public)
    * Returns every issue, not just PRs (more data)
    * Requires an extra call to `GET /repos/:owner/:repo/pulls/:pull_number` with provided link

**Conclusion:** I did not use this endpoint because it does not list PRs in a repo a user does not own or is not a member of

### 3) [Search API](https://developer.github.com/v3/search/#search-issues-and-pull-requests)

`GET /search/issues`

* Pros
    * Lists all PRs whether public, private, owned, or not owned
    * Seems to be how [Github does it](https://github.com/pulls)
    * According to [Stackoverflow](https://stackoverflow.com/questions/17412809/how-to-get-my-pull-requests-from-github-api), it is recommended by Github reps
* Cons
    * Requires two API calls (first one to get authenticated user's username, second one to get PRs)

**Conclusion:** This is the method I chose because it seems to be the only one that has all of the function the extension needs.