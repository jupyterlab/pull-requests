# Changelog

## 3.0.2 (2021-09-16)

- Fix bug for GitHub Entreprise (#61)
- Add PyPI classifiers

## 3.0.1 (2021-04-22)

- Add backport extension entrypoints to classical notebook server (#48)
- Pass directly the configuration object to manager (#47)  
  This breaks an internal API 

## 3.0.0 (2021-04-18)

- Port to JupyterLab 3 (#29)
- Fixes comment duplication when code mirror viewport is updated (#43)

## 2.1.0 (2021-04-05)

- Refactor code with latest @jupyterlab/git (more shared code) (#39)

## 2.0.1 (2021-03-17)

- Support pagination (#36)
- Restore JS tests (#33)
- Improve CI (#32)

## 2.0.0

First non-experimental release (#16)

> Support only JupyterLab 2.x

- Reorganize the code
- Add support for GitLab
- Replace monaco diff viewer by codemirror
- Render markdown
- Support discussion at PR level
