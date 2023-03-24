import * as core from "@actions/core";
import * as github from "@actions/github";

import { PullRequestEvent } from "@octokit/webhooks-definitions/schema";
import { getJiraIssue, getProjectKeys, createJiraLink } from "./jira";

import type { JiraIssue } from "./jiraTypes";

const rcbBranchPrefix = "patch/";
const GITHUB_TOKEN = core.getInput("GITHUB_TOKEN");
const event = github.context.payload as PullRequestEvent;
const COMMENT_HEADER = "### DHIS2 Jira Links";

function isIssueApproved(issue: JiraIssue, targetVersion: string): boolean {
  const rcbApprovalLabel = `APPROVED-${targetVersion}`;
  return issue.fields.labels.includes(rcbApprovalLabel);
}

async function createOrUpdateComment(
  issues: JiraIssue[],
  missingApprovals: string[]
) {
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const comments = await octokit.rest.issues.listComments({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: event.pull_request.number,
  });
  core.info(comments.data.toString());
  const existingComment = comments.data.find((comment) =>
    comment.body?.startsWith(COMMENT_HEADER)
  );

  const commentBody = `${COMMENT_HEADER}
${issues.map(
  (issue) => `
- [${issue.key}](${createJiraLink(issue.key)}) - ${issue.fields.summary}`
)}
${
  missingApprovals.length
    ? `
---
**RELEASE CONTROL BOARD APPROVAL REQUIRED**`
    : ""
}`;

  if (existingComment) {
    await octokit.rest.issues.updateComment({
      ...github.context.repo,
      issue_number: event.pull_request.number,
      comment_id: existingComment.id,
      body: commentBody,
    });
  } else {
    await octokit.rest.issues.createComment({
      ...github.context.repo,
      issue_number: event.pull_request.number,
      body: commentBody,
    });
  }
}

async function run() {
  try {
    const prTitle = event.pull_request.title;
    const prBody = event.pull_request.body;

    const requiresRCBApproval =
      event.pull_request.base.ref.startsWith(rcbBranchPrefix);

    const projectKeys = await getProjectKeys();

    let regex = new RegExp(`\\[(${projectKeys.join("|")})-[0-9]+\\]`, "g");
    const issueKeys = Array.from(prTitle.matchAll(regex), (m) =>
      m[0].substring(1, m[0].length - 1)
    );
    if (!issueKeys.length) {
      core.setFailed("Jira Issue Key missing in PR title.");
      return;
    }

    let issues = [];
    let missingApprovals = [];
    for (let key of issueKeys) {
      console.info(`Found key ${key}`);
      const issue = await getJiraIssue(key);
      issues.push(issue);

      if (requiresRCBApproval) {
        const targetVersion = event.pull_request.base.ref.substring(
          rcbBranchPrefix.length
        );
        if (!isIssueApproved(issue, targetVersion)) {
          missingApprovals.push(key);
        }
      }
    }

    createOrUpdateComment(issues, missingApprovals);

    if (missingApprovals.length === 1) {
      core.setFailed(
        `Issue ${missingApprovals[0]} has not been approved by the Release Control Board`
      );
      return;
    } else if (missingApprovals.length) {
      core.setFailed(
        `Issue ${missingApprovals.join(
          ", "
        )} has not been approved by the Release Control Board`
      );
      return;
    }
  } catch (error: any) {
    core.error(error);
    core.setFailed("Failed to link Jira issues");
  }
}

run();
