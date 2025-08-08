import * as github from '@actions/github';
export declare class GitHubService {
    private octokit;
    private context;
    constructor(token: string);
    getOctokit(): ReturnType<typeof github.getOctokit>;
    getContext(): typeof github.context;
    getCurrentPRReviewers(): Promise<string[]>;
    getPRAuthor(): string;
    addReviewers(reviewers: string[]): Promise<void>;
    getTopCodeContributor(): Promise<string | null>;
}
