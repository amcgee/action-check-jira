"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const jiraApi = 'https://dhis2.atlassian.net/rest/api/3';
const rcbBranchPrefix = 'patch/';
const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
const event = github.context.payload;
const COMMENT_HEADER = '### DHIS2 Jira Links';
function fetchJira(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield (0, node_fetch_1.default)(`${jiraApi}${path}`);
            const json = yield response.json();
            return json;
        }
        catch (e) {
            throw new Error(`Failed to fetch ${path} from Jira: ${e}`);
        }
    });
}
function getProjectKeysRegex() {
    return __awaiter(this, void 0, void 0, function* () {
        const projects = yield fetchJira('/project/search?status=live');
        const projectKeys = projects.map(project => project.key);
        return `(${projectKeys.join('|')})`;
    });
}
function getJiraIssues(key) {
    return __awaiter(this, void 0, void 0, function* () {
        const issue = yield fetchJira(`/issue/${key}?fields=labels`);
        return issue;
    });
}
function isIssueApproved(issue, targetVersion) {
    const rcbApprovalLabel = `APPROVED-${targetVersion}`;
    return issue.fields.labels.includes(rcbApprovalLabel);
}
function createOrUpdateComment(issues, missingApprovals) {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = github.getOctokit(GITHUB_TOKEN);
        const comments = yield octokit.rest.pulls.listReviewComments({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            pull_number: event.pull_request.number
        });
        const existingComment = comments.data.find(comment => comment.body.startsWith(COMMENT_HEADER));
        const commentBody = `${COMMENT_HEADER}
${issues.map(issue => `
- [${issue.key}](${issue.self}) - ${issue.fields.summary}`)}
${missingApprovals.length ? `
---
**RELEASE CONTROL BOARD APPROVAL REQUIRED**` : ''}`;
        if (existingComment) {
            yield octokit.rest.issues.updateComment(Object.assign(Object.assign({}, github.context.repo), { issue_number: event.pull_request.number, comment_id: existingComment.id, body: commentBody }));
        }
        yield octokit.rest.issues.createComment(Object.assign(Object.assign({}, github.context.repo), { issue_number: event.pull_request.number, body: commentBody }));
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const prTitle = event.pull_request.title;
            const prBody = event.pull_request.body;
            const requiresRCBApproval = event.pull_request.base.ref.startsWith(rcbBranchPrefix);
            const projectKeysRegex = yield getProjectKeysRegex();
            let regex = new RegExp(`[${projectKeysRegex}-[0-9]+]`);
            const issueKeys = regex.exec(prTitle);
            if (!(issueKeys === null || issueKeys === void 0 ? void 0 : issueKeys.length)) {
                core.setFailed("Jira Issue Key missing in PR title.");
                return;
            }
            let issues = [];
            let missingApprovals = [];
            for (let key of issueKeys) {
                console.info(`Found key ${key}`);
                const issue = yield getJiraIssues(key);
                issues.push(issue);
                if (requiresRCBApproval) {
                    const targetVersion = event.pull_request.base.ref.substring(rcbBranchPrefix.length);
                    if (!isIssueApproved(issue, targetVersion)) {
                        missingApprovals.push(key);
                    }
                }
            }
            createOrUpdateComment(issues, missingApprovals);
            if (missingApprovals.length === 1) {
                core.setFailed(`Issue ${missingApprovals[0]} has not been approved by the Release Control Board`);
                return;
            }
            else if (missingApprovals.length) {
                core.setFailed(`Issue ${missingApprovals.join(', ')} has not been approved by the Release Control Board`);
                return;
            }
        }
        catch (error) {
            core.info(error);
        }
    });
}
run();
