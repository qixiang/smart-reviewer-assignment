import { GitHubService } from './github-service';
import { PRParticipation, UserParticipationScore, ParticipationCheck } from './types';
export declare class PRHistoryService {
    private githubService;
    constructor(githubService: GitHubService);
    analyzePRHistory(lookbackCount: number, participationChecks: ParticipationCheck[]): Promise<PRParticipation[]>;
    calculateParticipationScores(prHistory: PRParticipation[], availableReviewers: string[]): UserParticipationScore[];
    selectBalancedReviewers(participationScores: UserParticipationScore[], excludeUsers: string[], count: number): string[];
}
