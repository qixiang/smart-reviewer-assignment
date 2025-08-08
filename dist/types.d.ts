export type SelectionMode = 'random' | 'balanced';
export type ParticipationCheck = 'reviewers' | 'comments';
export interface ActionInputs {
    reviewerList: string[];
    alwaysAdd: string[];
    minReviewers: number;
    addTopContributor: boolean;
    githubToken: string;
    selectionMode: SelectionMode;
    balancedLookback: number;
    participationChecks: ParticipationCheck[];
}
export interface FileContributor {
    username: string;
    linesChanged: number;
}
export interface ReviewerSelectionResult {
    selectedReviewers: string[];
    alreadyAssigned: string[];
    codeContributor?: string;
    selectionMethod?: string;
}
export interface PRParticipation {
    prNumber: number;
    reviewers: string[];
    commenters: string[];
    participants: string[];
}
export interface UserParticipationScore {
    username: string;
    participationCount: number;
    lastParticipatedPR?: number;
}
