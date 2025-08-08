import * as github from '@actions/github';
import * as core from '@actions/core';

export class GitHubService {
  private octokit: ReturnType<typeof github.getOctokit>;
  private context: typeof github.context;

  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  getOctokit(): ReturnType<typeof github.getOctokit> {
    return this.octokit;
  }

  getContext(): typeof github.context {
    return this.context;
  }

  async getCurrentPRReviewers(): Promise<string[]> {
    const { owner, repo } = this.context.repo;
    const prNumber = this.context.payload.pull_request?.number;

    if (!prNumber) {
      throw new Error('This action can only be run on pull request events');
    }

    const { data: pr } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    return pr.requested_reviewers?.map(reviewer => reviewer.login) || [];
  }

  getPRAuthor(): string {
    const prAuthor = this.context.payload.pull_request?.user?.login;
    if (!prAuthor) {
      throw new Error('Unable to determine PR author');
    }
    return prAuthor;
  }

  async addReviewers(reviewers: string[]): Promise<void> {
    const { owner, repo } = this.context.repo;
    const prNumber = this.context.payload.pull_request?.number;

    if (!prNumber) {
      throw new Error('This action can only be run on pull request events');
    }

    if (reviewers.length === 0) {
      core.info('No reviewers to add');
      return;
    }

    await this.octokit.rest.pulls.requestReviewers({
      owner,
      repo,
      pull_number: prNumber,
      reviewers,
    });

    core.info(`Added reviewers: ${reviewers.join(', ')}`);
  }

  async getTopCodeContributor(): Promise<string | null> {
    const { owner, repo } = this.context.repo;
    const prNumber = this.context.payload.pull_request?.number;

    if (!prNumber) {
      throw new Error('This action can only be run on pull request events');
    }

    try {
      const { data: files } = await this.octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
      });

      const contributorMap = new Map<string, number>();
      const prAuthor = this.getPRAuthor();

      for (const file of files) {
        if (file.status === 'removed') continue;

        try {
          // Get recent commits (last 6 months) for better relevance
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

          const commits = await this.octokit.rest.repos.listCommits({
            owner,
            repo,
            path: file.filename,
            since: sixMonthsAgo.toISOString(),
            per_page: 30,
          });

          // Weight recent commits higher than older ones
          commits.data.forEach((commit, index) => {
            const author = commit.author?.login;
            if (author) {
              // Include all contributors, we'll filter out PR author later
              const weight = Math.max(1, 30 - index); // Weight decreases with age
              const currentCount = contributorMap.get(author) || 0;
              contributorMap.set(author, currentCount + weight);
            }
          });
        } catch (error) {
          core.warning(`Failed to get commits for file ${file.filename}: ${error}`);
        }
      }

      if (contributorMap.size === 0) {
        core.info('No recent contributors found for modified files');
        return null;
      }

      // Sort contributors by score (highest first)
      const sortedContributors = Array.from(contributorMap.entries())
        .sort((a, b) => b[1] - a[1]);

      core.info('Code contributors for modified files:');
      sortedContributors.forEach(([contributor, score], index) => {
        const isPRAuthor = contributor === prAuthor;
        core.info(`  ${index + 1}. ${contributor}: ${score}${isPRAuthor ? ' (PR author - skipped)' : ''}`);
      });

      // Find the first contributor that is NOT the PR author
      const topContributor = sortedContributors.find(([contributor]) => contributor !== prAuthor);

      if (!topContributor) {
        core.info('No suitable code contributor found (all contributors are the PR author)');
        return null;
      }

      core.info(`Selected top contributor: ${topContributor[0]} (score: ${topContributor[1]})`);
      return topContributor[0];
    } catch (error) {
      core.warning(`Failed to analyze code contributors: ${error}`);
      return null;
    }
  }
}