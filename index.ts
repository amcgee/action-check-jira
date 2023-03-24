import * as core from '@actions/core';
import * as github from '@actions/github';
import fetch from 'node-fetch';
import { PullRequestEvent } from '@octokit/webhooks-definitions/schema'

const jiraApi = 'https://dhis2.atlassian.net/rest/api/3'
const rcbBranchPrefix = 'patch/'
const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
const event = github.context.payload as PullRequestEvent
const COMMENT_HEADER = '### DHIS2 Jira Links'

interface JiraProject {
  id: number,
  self: string,
  key: string,
  name: string,
  avatarUrls: {
    "48x48": string,
    "24x24": string,
    "16x16": string,
    "32x32": string,
  }
}
interface JiraIssue {
  id: number,
  self: string,
  key: string,
  fields: {
    labels: string[],
    summary: string
  }
}

async function fetchJira(path: String) {
  try {
    const response = await fetch(`${jiraApi}${path}`)
    const json = await response.json();
    return json
  } catch (e) {
    throw new Error(`Failed to fetch ${path} from Jira: ${e}`)
  }
}
async function getProjectKeysRegex() {
  const projects = <JiraProject[]> await fetchJira('/project/search?status=live')
  const projectKeys = projects.map(project => project.key)
  return `(${projectKeys.join('|')})`
}
async function getJiraIssues(key: string): Promise<JiraIssue> {
  const issue = <JiraIssue> await fetchJira(`/issue/${key}?fields=labels`)
  return issue
}

function isIssueApproved(issue: JiraIssue, targetVersion: string): boolean {
  const rcbApprovalLabel = `APPROVED-${targetVersion}`
  return issue.fields.labels.includes(rcbApprovalLabel)
}

async function createOrUpdateComment(issues: JiraIssue[], missingApprovals: string[]) {
  const octokit = github.getOctokit(GITHUB_TOKEN)
  const comments = await octokit.rest.pulls.listReviewComments({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: event.pull_request.number
  })
  const existingComment = comments.data.find(comment => comment.body.startsWith(COMMENT_HEADER))

  const commentBody = `${COMMENT_HEADER}
${issues.map(issue => `
- [${issue.key}](${issue.self}) - ${issue.fields.summary}`)}
${missingApprovals.length ? `
---
**RELEASE CONTROL BOARD APPROVAL REQUIRED**` : ''}`

  if (existingComment) {
    await octokit.rest.issues.updateComment({ 
      ...github.context.repo,
      issue_number: event.pull_request.number,
      comment_id: existingComment.id,
      body: commentBody
    })
  }
  await octokit.rest.issues.createComment({
    ...github.context.repo,
    issue_number: event.pull_request.number,
    body: commentBody
  })
}

async function run() {
  try {
    const prTitle = event.pull_request.title
    const prBody = event.pull_request.body

    const requiresRCBApproval = event.pull_request.base.ref.startsWith(rcbBranchPrefix);

    const projectKeysRegex = await getProjectKeysRegex();
    let regex = new RegExp(`[${projectKeysRegex}-[0-9]+]`);
    const issueKeys = regex.exec(prTitle)
    if (!issueKeys?.length) {
      core.setFailed("Jira Issue Key missing in PR title.");
      return;
    }

    let issues = []
    let missingApprovals = []
    for (let key of issueKeys) {
      console.info(`Found key ${key}`)
      const issue = await getJiraIssues(key)
      issues.push(issue)

      if (requiresRCBApproval) {
        const targetVersion = event.pull_request.base.ref.substring(rcbBranchPrefix.length);
        if (!isIssueApproved(issue, targetVersion)) {
          missingApprovals.push(key)
        }
      }
    }

    createOrUpdateComment(issues, missingApprovals);

    if (missingApprovals.length === 1) {
      core.setFailed(`Issue ${missingApprovals[0]} has not been approved by the Release Control Board`)
      return
    } else if (missingApprovals.length) {
      core.setFailed(`Issue ${missingApprovals.join(', ')} has not been approved by the Release Control Board`)
      return
    }
  } catch (error: any) {
    core.info(error);
  }
}

run();