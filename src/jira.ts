import * as core from "@actions/core";
import fetch from "node-fetch";

import {
  JiraAPIPaginatedResponse,
  JiraIssue,
  JiraProject,
} from "./jiraApiTypes";

const jiraApi = "https://dhis2.atlassian.net/rest/api/3";

async function fetchJira(path: String) {
  try {
    const uri = `${jiraApi}${path}`;
    core.info(`Fetching ${uri}`);
    const response = await fetch(uri);
    core.info(`[${response.status}] ${response.statusText}`);
    const json = await response.json();
    core.info(`response: ${JSON.stringify(json, undefined, 2)}`);
    return json;
  } catch (e) {
    throw new Error(`Failed to fetch ${path} from Jira: ${e}`);
  }
}

export async function getProjectKeys() {
  const projects = <JiraAPIPaginatedResponse<JiraProject>>(
    await fetchJira("/project/search?status=live")
  );
  return projects.values.map((project) => project.key);
}
export async function getJiraIssue(key: string): Promise<JiraIssue> {
  const issue = <JiraIssue>await fetchJira(`/issue/${key}?fields=labels`);
  return issue;
}
