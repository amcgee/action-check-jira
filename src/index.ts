
import * as core from "@actions/core";
import * as github from "@actions/github";

import { PullRequestEvent } from "@octokit/webhooks-definitions/schema";
import { createOrUpdateComment } from "./github";
import { getJiraIssue, getProjectKeys, createJiraLink } from "./jira";

import type { JiraIssue } from "./jiraTypes";

const rcbBranchPrefix = "patch/";
const event = github.context.payload as PullRequestEvent;
const escapeHatch = '[NO JIRA]'

function isIssueApproved(issue: JiraIssue, targetVersion: string): boolean {
  const rcbApprovalLabel = `APPROVED-${targetVersion}`;
  return issue.fields.labels.includes(rcbApprovalLabel);
}

const missingIssueKeyComment = `
❌ **A JIRA issue must be specified in the PR title**

Some hints:
- Use the format \`[DHIS2-12345]\`
- Multiple issues can be specified, i.e. \`[DHIS2-12345] [LIBS-24680]\`
- In the **very rare case** where no Jira issue can be associated with this PR, use \`${escapeHatch}\`
`

const noJiraComment = `
❓ **${escapeHatch}** Are you sure this PR shouldn't be linked to a Jira issue?
`

function generateSuccessComment(issues: JiraIssue[], missingApprovals: string[], invalidIssuesText: string) {
  return `
${issues.map(
  (issue) => `
- [${issue.key}](${createJiraLink(issue.key)}) - ${issue.fields.summary}`
)}

${invalidIssuesText}

${
  missingApprovals.length
    ? `
---
🛑 **RELEASE CONTROL BOARD APPROVAL REQUIRED** 👮`
    : ""
}`;
}

async function run() {
  try {
    const prTitle = event.pull_request.title;

    const requiresRCBApproval =
      event.pull_request.base.ref.startsWith(rcbBranchPrefix);

    const projectKeys = await getProjectKeys();

    let regex = new RegExp(`\\[(${projectKeys?.join("|")})-[0-9]+\\]`, "g");
    const issueKeys = Array.from(prTitle.matchAll(regex), (m) =>
      m[0].substring(1, m[0].length - 1)
    );
    if (!issueKeys.length) {
      if (prTitle.indexOf(escapeHatch) !== -1) {
        createOrUpdateComment(noJiraComment)
        core.info(`Found escape hatch ${escapeHatch}`)
        return
      }
      createOrUpdateComment(missingIssueKeyComment)
      core.setFailed("Jira Issue Key missing in PR title.");
      return;
    }

    const issues = [];
    const invalidIssues = [];
    const missingApprovals = [];
    for (let key of issueKeys) {
      console.info(`Found key ${key}`);
      const issue = await getJiraIssue(key);
      if (issue) {
        issues.push(issue);

      if (requiresRCBApproval) {
        const targetVersion = event.pull_request.base.ref.substring(
          rcbBranchPrefix.length
        );
        if (!isIssueApproved(issue, targetVersion)) {
          missingApprovals.push(key);
        }
      }
      } else {
        invalidIssues.push(key)
      }
    }

    const invalidIssuesText = invalidIssues.map(key => `❓ Issue key \`${key}\` appears to be invalid`).join('\n\n')
    if (invalidIssues.length) {
      if (!issues.length) {
        createOrUpdateComment(`${missingIssueKeyComment}\n\n${invalidIssuesText}`);
        core.setFailed("No valid Jira issue keys found in PR title.");
        return
      }
    }

    createOrUpdateComment(generateSuccessComment(issues, missingApprovals, invalidIssuesText));

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
    createOrUpdateComment('❌ An unknown error occured, check the Github Action logs')
    core.error(error);
    core.setFailed("Failed to link Jira issues");
  }
}

run();
