import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as core from '@actions/core';
import { getActionInputs, shuffleArray, selectRandomReviewers } from './utils';

// Mock @actions/core
vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
}));

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getActionInputs', () => {
    it('should parse inputs with default values', () => {
      const mockGetInput = vi.mocked(core.getInput);
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'reviewer-list': 'alice,bob,charlie',
          'github-token': 'test-token',
        };
        return inputs[name] || '';
      });

      const result = getActionInputs();

      expect(result).toEqual({
        reviewerList: ['alice', 'bob', 'charlie'],
        alwaysAdd: [],
        minReviewers: 2,
        addTopContributor: true,
        selectionMode: 'random',
        balancedLookback: 10,
        participationChecks: ['reviewers', 'comments'],
        githubToken: 'test-token',
      });
    });

    it('should parse all custom inputs correctly', () => {
      const mockGetInput = vi.mocked(core.getInput);
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'reviewer-list': 'alice,bob,charlie,diana',
          'always-add': 'alice,bob',
          'min-reviewers': '3',
          'add-top-contributor': 'false',
          'selection-mode': 'balanced',
          'balanced-lookback': '15',
          'participation-checks': 'reviewers',
          'github-token': 'custom-token',
        };
        return inputs[name] || '';
      });

      const result = getActionInputs();

      expect(result).toEqual({
        reviewerList: ['alice', 'bob', 'charlie', 'diana'],
        alwaysAdd: ['alice', 'bob'],
        minReviewers: 3,
        addTopContributor: false,
        selectionMode: 'balanced',
        balancedLookback: 15,
        participationChecks: ['reviewers'],
        githubToken: 'custom-token',
      });
    });

    it('should handle comma-separated participation checks', () => {
      const mockGetInput = vi.mocked(core.getInput);
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'reviewer-list': 'alice,bob',
          'participation-checks': 'reviewers,comments',
          'github-token': 'test-token',
        };
        return inputs[name] || '';
      });

      const result = getActionInputs();

      expect(result.participationChecks).toEqual(['reviewers', 'comments']);
    });

    it('should filter out invalid participation checks', () => {
      const mockGetInput = vi.mocked(core.getInput);
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'reviewer-list': 'alice,bob',
          'participation-checks': 'reviewers,invalid,comments',
          'github-token': 'test-token',
        };
        return inputs[name] || '';
      });

      const result = getActionInputs();

      expect(result.participationChecks).toEqual(['reviewers', 'comments']);
    });

    it('should default to both checks if no valid participation checks', () => {
      const mockGetInput = vi.mocked(core.getInput);
      mockGetInput.mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          'reviewer-list': 'alice,bob',
          'participation-checks': 'invalid1,invalid2',
          'github-token': 'test-token',
        };
        return inputs[name] || '';
      });

      const result = getActionInputs();

      expect(result.participationChecks).toEqual(['reviewers', 'comments']);
    });
  });

  describe('shuffleArray', () => {
    it('should return array with same elements', () => {
      const original = ['a', 'b', 'c', 'd', 'e'];
      const shuffled = shuffleArray(original);

      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should not modify original array', () => {
      const original = ['a', 'b', 'c'];
      const originalCopy = [...original];
      shuffleArray(original);

      expect(original).toEqual(originalCopy);
    });

    it('should handle empty array', () => {
      const result = shuffleArray([]);
      expect(result).toEqual([]);
    });

    it('should handle single element array', () => {
      const result = shuffleArray(['single']);
      expect(result).toEqual(['single']);
    });
  });

  describe('selectRandomReviewers', () => {
    it('should select correct number of reviewers', () => {
      const available = ['alice', 'bob', 'charlie', 'diana'];
      const alreadyAssigned = ['eve'];
      
      const result = selectRandomReviewers(available, alreadyAssigned, 2);
      
      expect(result).toHaveLength(2);
      result.forEach(reviewer => {
        expect(available).toContain(reviewer);
        expect(alreadyAssigned).not.toContain(reviewer);
      });
    });

    it('should exclude already assigned reviewers', () => {
      const available = ['alice', 'bob', 'charlie'];
      const alreadyAssigned = ['alice', 'bob'];
      
      const result = selectRandomReviewers(available, alreadyAssigned, 2);
      
      expect(result).toEqual(['charlie']);
    });

    it('should return empty array when no eligible reviewers', () => {
      const available = ['alice', 'bob'];
      const alreadyAssigned = ['alice', 'bob'];
      
      const result = selectRandomReviewers(available, alreadyAssigned, 2);
      
      expect(result).toEqual([]);
    });

    it('should handle count larger than available reviewers', () => {
      const available = ['alice', 'bob'];
      const alreadyAssigned: string[] = [];
      
      const result = selectRandomReviewers(available, alreadyAssigned, 5);
      
      expect(result).toHaveLength(2);
      expect(result.sort()).toEqual(['alice', 'bob']);
    });

    it('should return empty array when count is zero', () => {
      const available = ['alice', 'bob', 'charlie'];
      const alreadyAssigned: string[] = [];
      
      const result = selectRandomReviewers(available, alreadyAssigned, 0);
      
      expect(result).toEqual([]);
    });

    it('should handle empty available reviewers list', () => {
      const available: string[] = [];
      const alreadyAssigned: string[] = [];
      
      const result = selectRandomReviewers(available, alreadyAssigned, 2);
      
      expect(result).toEqual([]);
    });
  });
});