import { ActionInputs, ReviewerSelectionResult } from './types';
import { GitHubService } from './github-service';
export declare class ReviewerService {
    private githubService;
    private prHistoryService;
    constructor(githubService: GitHubService);
    selectReviewers(inputs: ActionInputs): Promise<ReviewerSelectionResult>;
    private selectBalancedReviewers;
}
