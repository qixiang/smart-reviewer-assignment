import * as core from '@actions/core';
import { ActionInputs, ReviewerSelectionResult } from './types';
import { selectRandomReviewers } from './utils';
import { GitHubService } from './github-service';
import { PRHistoryService } from './pr-history-service';

export class ReviewerService {
  private githubService: GitHubService;
  private prHistoryService: PRHistoryService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
    this.prHistoryService = new PRHistoryService(githubService);
  }

  async selectReviewers(inputs: ActionInputs): Promise<ReviewerSelectionResult> {
    const currentReviewers = await this.githubService.getCurrentPRReviewers();
    const prAuthor = this.githubService.getPRAuthor();
    
    core.info(`Current reviewers: ${currentReviewers.join(', ') || 'none'}`);
    core.info(`PR Author: ${prAuthor}`);
    core.info(`Selection mode: ${inputs.selectionMode}`);

    let reviewersToAdd: string[] = [];
    let alreadyAssigned: string[] = [...currentReviewers, prAuthor];
    let selectionMethod: string = inputs.selectionMode;

    reviewersToAdd.push(...inputs.alwaysAdd.filter(
      reviewer => !alreadyAssigned.includes(reviewer)
    ));

    const remainingSlots = Math.max(0, inputs.minReviewers - reviewersToAdd.length);
    
    if (remainingSlots > 0) {
      let selectedReviewers: string[];
      
      if (inputs.selectionMode === 'balanced') {
        selectedReviewers = await this.selectBalancedReviewers(
          inputs,
          [...alreadyAssigned, ...reviewersToAdd],
          remainingSlots
        );
        selectionMethod = `balanced (lookback: ${inputs.balancedLookback}, checks: ${inputs.participationChecks.join(',')})`;
      } else {
        selectedReviewers = selectRandomReviewers(
          inputs.reviewerList,
          [...alreadyAssigned, ...reviewersToAdd],
          remainingSlots
        );
        selectionMethod = 'random';
      }
      
      reviewersToAdd.push(...selectedReviewers);
    }

    let codeContributor: string | undefined;
    if (inputs.addTopContributor) {
      const contributor = await this.githubService.getTopCodeContributor();
      if (contributor && !alreadyAssigned.includes(contributor) && !reviewersToAdd.includes(contributor)) {
        codeContributor = contributor;
        reviewersToAdd.push(contributor);
      }
    }

    return {
      selectedReviewers: reviewersToAdd,
      alreadyAssigned,
      codeContributor,
      selectionMethod
    };
  }

  private async selectBalancedReviewers(
    inputs: ActionInputs,
    excludeUsers: string[],
    count: number
  ): Promise<string[]> {
    core.info(`Analyzing PR history for balanced selection...`);
    
    const prHistory = await this.prHistoryService.analyzePRHistory(
      inputs.balancedLookback,
      inputs.participationChecks
    );

    if (prHistory.length === 0) {
      core.warning('No PR history found, falling back to random selection');
      return selectRandomReviewers(inputs.reviewerList, excludeUsers, count);
    }

    const participationScores = this.prHistoryService.calculateParticipationScores(
      prHistory,
      inputs.reviewerList
    );

    return this.prHistoryService.selectBalancedReviewers(
      participationScores,
      excludeUsers,
      count
    );
  }
}