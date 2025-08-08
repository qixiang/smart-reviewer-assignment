import * as core from '@actions/core';
import { GitHubService } from './github-service';
import { PRParticipation, UserParticipationScore, ParticipationCheck } from './types';

export class PRHistoryService {
  private githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  async analyzePRHistory(
    lookbackCount: number,
    participationChecks: ParticipationCheck[]
  ): Promise<PRParticipation[]> {
    const octokit = this.githubService.getOctokit();
    const context = this.githubService.getContext();
    const { owner, repo } = context.repo;

    try {
      core.info(`Analyzing last ${lookbackCount} PRs for participation history`);
      
      const { data: prs } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'closed',
        sort: 'updated',
        direction: 'desc',
        per_page: lookbackCount,
      });

      const prParticipations: PRParticipation[] = [];

      for (const pr of prs) {
        const participation: PRParticipation = {
          prNumber: pr.number,
          reviewers: [],
          commenters: [],
          participants: [],
        };

        if (participationChecks.includes('reviewers')) {
          try {
            const { data: reviews } = await octokit.rest.pulls.listReviews({
              owner,
              repo,
              pull_number: pr.number,
            });

            participation.reviewers = [...new Set(
              reviews
                .map(review => review.user?.login)
                .filter((login): login is string => !!login)
            )];
          } catch (error) {
            core.warning(`Failed to get reviews for PR #${pr.number}: ${error}`);
          }
        }

        if (participationChecks.includes('comments')) {
          try {
            const { data: comments } = await octokit.rest.issues.listComments({
              owner,
              repo,
              issue_number: pr.number,
            });

            participation.commenters = [...new Set(
              comments
                .map(comment => comment.user?.login)
                .filter((login): login is string => !!login)
            )];
          } catch (error) {
            core.warning(`Failed to get comments for PR #${pr.number}: ${error}`);
          }
        }

        participation.participants = [...new Set([
          ...participation.reviewers,
          ...participation.commenters,
        ])];

        prParticipations.push(participation);
        core.debug(`PR #${pr.number}: ${participation.participants.length} participants`);
      }

      return prParticipations;
    } catch (error) {
      core.warning(`Failed to analyze PR history: ${error}`);
      return [];
    }
  }

  calculateParticipationScores(
    prHistory: PRParticipation[],
    availableReviewers: string[]
  ): UserParticipationScore[] {
    const userScores = new Map<string, UserParticipationScore>();

    availableReviewers.forEach(reviewer => {
      userScores.set(reviewer, {
        username: reviewer,
        participationCount: 0,
        lastParticipatedPR: undefined,
      });
    });

    prHistory.forEach(pr => {
      pr.participants.forEach(participant => {
        if (userScores.has(participant)) {
          const score = userScores.get(participant)!;
          score.participationCount++;
          if (!score.lastParticipatedPR) {
            score.lastParticipatedPR = pr.prNumber;
          }
        }
      });
    });

    return Array.from(userScores.values()).sort((a, b) => {
      if (a.participationCount !== b.participationCount) {
        return a.participationCount - b.participationCount;
      }
      
      if (a.lastParticipatedPR && b.lastParticipatedPR) {
        return a.lastParticipatedPR - b.lastParticipatedPR;
      }
      
      if (a.lastParticipatedPR && !b.lastParticipatedPR) {
        return 1;
      }
      
      if (!a.lastParticipatedPR && b.lastParticipatedPR) {
        return -1;
      }
      
      return 0;
    });
  }

  selectBalancedReviewers(
    participationScores: UserParticipationScore[],
    excludeUsers: string[],
    count: number
  ): string[] {
    const eligibleScores = participationScores.filter(
      score => !excludeUsers.includes(score.username)
    );

    core.info('Balanced selection participation scores:');
    eligibleScores.forEach(score => {
      core.info(`  ${score.username}: ${score.participationCount} participations` +
        (score.lastParticipatedPR ? ` (last: PR #${score.lastParticipatedPR})` : ' (never participated)'));
    });

    return eligibleScores.slice(0, count).map(score => score.username);
  }
}