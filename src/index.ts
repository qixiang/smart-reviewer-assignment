import * as core from '@actions/core';
import { getActionInputs } from './utils';
import { GitHubService } from './github-service';
import { ReviewerService } from './reviewer-service';

async function run(): Promise<void> {
  try {
    const inputs = getActionInputs();
    
    core.info('Smart Reviewer Assignment started');
    core.info(`Reviewer list: ${inputs.reviewerList.join(', ')}`);
    core.info(`Always add: ${inputs.alwaysAdd.join(', ') || 'none'}`);
    core.info(`Min reviewers: ${inputs.minReviewers}`);
    core.info(`Selection mode: ${inputs.selectionMode}`);
    core.info(`Add top contributor: ${inputs.addTopContributor ? 'enabled' : 'disabled'}`);
    
    if (inputs.selectionMode === 'balanced') {
      core.info(`Balanced lookback: ${inputs.balancedLookback} PRs`);
      core.info(`Participation checks: ${inputs.participationChecks.join(', ')}`);
    }

    const githubService = new GitHubService(inputs.githubToken);
    const reviewerService = new ReviewerService(githubService);

    const result = await reviewerService.selectReviewers(inputs);

    if (result.selectedReviewers.length === 0) {
      core.info('No additional reviewers to add');
      return;
    }

    await githubService.addReviewers(result.selectedReviewers);

    core.info(`Successfully added ${result.selectedReviewers.length} reviewers using ${result.selectionMethod}`);
    if (result.codeContributor) {
      core.info(`Added top contributor: ${result.codeContributor}`);
    }

    core.setOutput('reviewers-added', result.selectedReviewers.join(','));
    core.setOutput('code-contributor', result.codeContributor || '');
    core.setOutput('selection-method', result.selectionMethod || inputs.selectionMode);
  } catch (error) {
    core.setFailed(`Action failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();