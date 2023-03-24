# DHIS2 Jira Automation Action

This action enforces the following GitHub-Jira linking rule:
- Valid Jira issues must be referenced in PR titles (`[DHIS2-1234]`, `[DHIS2-1234] [LIBS-2468]`)
- If no jira issue is referenced, this must be explicitly declared in the PR title (`[NO JIRA]`)
- When a PR targets a `patch/<version>` branch, the linked Jira issue(s) must have the label `APPROVED-<version>`

It also creates a PR comment with convenient links to Jira and warnings about any violated rules.
