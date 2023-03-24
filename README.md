# DHIS2 Jira Automation Action

This action enforces the following GitHub-Jira linking rule:
- Valid Jira issues must be referenced in PR titles (`[DHIS2-1234]`, `[DHIS2-1234] [LIBS-2468]`)
- If no jira issue is referenced, this must be explicitly declared in the PR title (`[NO JIRA]`)
- When a PR targets a `patch/<version>` branch, the linked Jira issue(s) must have the label `APPROVED-<version>`

It also creates a PR comment with convenient links to Jira and warnings about any violated rules.

In the future we may also be able to:
1. Automatically update state of Jira issue when PR is ready for review / testing / done :notes:
2. Automatically set fix versions :muscle:
3. Attempt to automate backport PR creation to all target versions or manually (by checking boxes) :boom:
4. Ensure Jira component is set correctly :feet:

### The action in action

<img width="920" alt="Screen Shot 2023-03-25 at 01 02 13" src="https://user-images.githubusercontent.com/947888/227660129-4af3cee4-3c9f-4bf8-96a5-00a7eb6c91de.png">
<img width="983" alt="Screen Shot 2023-03-25 at 00 50 18" src="https://user-images.githubusercontent.com/947888/227660134-e263e8b2-8219-4fe0-9498-ee12b9f07625.png">
<img width="996" alt="Screen Shot 2023-03-25 at 00 49 44" src="https://user-images.githubusercontent.com/947888/227660138-feb3ca18-3d9d-40bb-8556-d64fd2f559b8.png">
<img width="958" alt="Screen Shot 2023-03-25 at 00 48 47" src="https://user-images.githubusercontent.com/947888/227660140-7e91e42c-d2f4-4f4a-a695-513daeae029a.png">
<img width="965" alt="Screen Shot 2023-03-25 at 00 48 16" src="https://user-images.githubusercontent.com/947888/227660144-3f6b554a-128a-4f87-90d3-7fbb24b0b623.png">
<img width="945" alt="Screen Shot 2023-03-25 at 00 47 45" src="https://user-images.githubusercontent.com/947888/227660149-16b7aade-5954-4978-bd30-a196b940edaf.png">
