import * as core from "@actions/core";
import fetch from "node-fetch";

import {
  JiraAPIPaginatedResponse,
  JiraIssue,
  JiraProject,
} from "./jiraTypes";

const jiraBase = "https://dhis2.atlassian.net"
const jiraApi = `${jiraBase}/rest/api/3`;

async function fetchJira<T>(path: String): Promise<T | null> {
  try {
    const uri = `${jiraApi}${path}`;
    core.info(`Fetching ${uri}`);
    const response = await fetch(uri);
    core.info(`[${response.status}] ${response.statusText}`);
    if (response.status === 404) {
      return null
    }
    const json = <T> await response.json();
    core.info(`response: ${JSON.stringify(json, undefined, 2)}`);
    return json;
  } catch (e) {
    throw new Error(`Failed to fetch ${path} from Jira: ${e}`);
  }
}

export async function getProjectKeys() {
  const projects = (
    await fetchJira<JiraAPIPaginatedResponse<JiraProject>>("/project/search?status=live")
  );
  return projects?.values.map((project) => project.key);
}
export async function getJiraIssue(key: string) {
  const issue = await fetchJira<JiraIssue>(`/issue/${key}?fields=labels,summary`);
  return issue;
}

export function createJiraLink(key: string): string {
  return `${jiraBase}/browse/${key}`
}
