export interface JiraProject {
  self: string;
  id: number;
  key: string;
  name: string;
  avatarUrls: {
    "48x48": string;
    "24x24": string;
    "16x16": string;
    "32x32": string;
  };
}
export interface JiraIssue {
  self: string;
  id: number;
  key: string;
  fields: {
    labels: string[];
    summary: string;
  };
}

export interface JiraAPIPaginatedResponse<T> {
    self: string;
    maxResults: number
    startAt: number
    total: number
    isLast: boolean
    values: T[]
}