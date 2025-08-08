import * as core from '@actions/core';
import { ActionInputs, SelectionMode, ParticipationCheck } from './types';

export function getActionInputs(): ActionInputs {
  const reviewerListInput = core.getInput('reviewer-list', { required: true });
  const alwaysAddInput = core.getInput('always-add') || '';
  const minReviewersInput = core.getInput('min-reviewers') || '2';
  const addTopContributorInput = core.getInput('add-top-contributor') || 'true';
  const selectionModeInput = core.getInput('selection-mode') || 'random';
  const balancedLookbackInput = core.getInput('balanced-lookback') || '10';
  const participationChecksInput = core.getInput('participation-checks') || 'reviewers,comments';
  const githubToken = core.getInput('github-token', { required: true });

  const selectionMode: SelectionMode = selectionModeInput === 'balanced' ? 'balanced' : 'random';
  
  const participationChecks: ParticipationCheck[] = participationChecksInput
    .split(',')
    .map(s => s.trim())
    .filter((check): check is ParticipationCheck => 
      check === 'reviewers' || check === 'comments'
    );

  if (participationChecks.length === 0) {
    participationChecks.push('reviewers', 'comments');
  }

  return {
    reviewerList: reviewerListInput.split(',').map(s => s.trim()).filter(Boolean),
    alwaysAdd: alwaysAddInput.split(',').map(s => s.trim()).filter(Boolean),
    minReviewers: parseInt(minReviewersInput, 10),
    addTopContributor: addTopContributorInput.toLowerCase() === 'true',
    selectionMode,
    balancedLookback: parseInt(balancedLookbackInput, 10),
    participationChecks,
    githubToken
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function selectRandomReviewers(
  availableReviewers: string[],
  alreadyAssigned: string[],
  count: number
): string[] {
  const eligible = availableReviewers.filter(
    reviewer => !alreadyAssigned.includes(reviewer)
  );
  
  const shuffled = shuffleArray(eligible);
  return shuffled.slice(0, count);
}