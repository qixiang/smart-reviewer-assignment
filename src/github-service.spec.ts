import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as github from '@actions/github';
import * as core from '@actions/core';
import { GitHubService } from './github-service';

// Mock dependencies
vi.mock('@actions/github', () => ({
  getOctokit: vi.fn(),
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    payload: {
      pull_request: {
        number: 123,
        user: { login: 'pr-author' }
      }
    }
  }
}));

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
}));

describe('GitHubService', () => {
  let mockOctokit: any;
  let githubService: GitHubService;

  beforeEach(() => {
    mockOctokit = {
      rest: {
        pulls: {
          get: vi.fn(),
          requestReviewers: vi.fn(),
          listFiles: vi.fn(),
          listReviews: vi.fn(),
        },
        repos: {
          listCommits: vi.fn(),
          getCommit: vi.fn(),
        },
      },
    };

    vi.mocked(github.getOctokit).mockReturnValue(mockOctokit);
    githubService = new GitHubService('test-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentPRReviewers', () => {
    it('should return list of current reviewers', async () => {
      const mockPR = {
        requested_reviewers: [
          { login: 'alice' },
          { login: 'bob' }
        ]
      };

      mockOctokit.rest.pulls.get.mockResolvedValue({ data: mockPR });

      const result = await githubService.getCurrentPRReviewers();

      expect(result).toEqual(['alice', 'bob']);
      expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
      });
    });

    it('should return empty array when no reviewers', async () => {
      const mockPR = { requested_reviewers: null };
      mockOctokit.rest.pulls.get.mockResolvedValue({ data: mockPR });

      const result = await githubService.getCurrentPRReviewers();

      expect(result).toEqual([]);
    });

    it('should throw error when no PR number', async () => {
      // Temporarily change the context
      const originalPayload = github.context.payload;
      (github.context as any).payload = {};
      
      const serviceWithEmptyContext = new GitHubService('test-token');

      await expect(serviceWithEmptyContext.getCurrentPRReviewers()).rejects.toThrow(
        'This action can only be run on pull request events'
      );

      // Restore context
      (github.context as any).payload = originalPayload;
    });
  });

  describe('getPRAuthor', () => {
    it('should return PR author username', () => {
      const result = githubService.getPRAuthor();
      expect(result).toBe('pr-author');
    });

    it('should throw error when PR author not found', () => {
      const originalPayload = github.context.payload;
      (github.context as any).payload = { pull_request: { user: null } };

      expect(() => githubService.getPRAuthor()).toThrow('Unable to determine PR author');

      // Restore context
      (github.context as any).payload = originalPayload;
    });
  });

  describe('addReviewers', () => {
    it('should add reviewers to PR', async () => {
      mockOctokit.rest.pulls.requestReviewers.mockResolvedValue({});

      await githubService.addReviewers(['alice', 'bob']);

      expect(mockOctokit.rest.pulls.requestReviewers).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        reviewers: ['alice', 'bob'],
      });
      expect(core.info).toHaveBeenCalledWith('Added reviewers: alice, bob');
    });

    it('should do nothing when no reviewers to add', async () => {
      await githubService.addReviewers([]);

      expect(mockOctokit.rest.pulls.requestReviewers).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith('No reviewers to add');
    });
  });

  describe('getTopCodeContributor', () => {
    beforeEach(() => {
      // Mock current date for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return top contributor excluding PR author', async () => {
      const mockFiles = [
        { filename: 'src/file1.ts', status: 'modified' },
        { filename: 'src/file2.ts', status: 'modified' }
      ];

      const mockCommits = [
        { author: { login: 'alice' } },
        { author: { login: 'bob' } },
        { author: { login: 'pr-author' } }, // Should be excluded
        { author: { login: 'alice' } },
      ];

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({ data: mockFiles });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: mockCommits });

      const result = await githubService.getTopCodeContributor();

      expect(result).toBe('alice');
      expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
      });
    });

    it('should return null when no contributors found', async () => {
      const mockFiles = [
        { filename: 'src/file1.ts', status: 'modified' }
      ];

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({ data: mockFiles });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [] });

      const result = await githubService.getTopCodeContributor();

      expect(result).toBeNull();
    });

    it('should return null when all contributors are PR author', async () => {
      const mockFiles = [
        { filename: 'src/file1.ts', status: 'modified' }
      ];

      const mockCommits = [
        { author: { login: 'pr-author' } },
        { author: { login: 'pr-author' } },
      ];

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({ data: mockFiles });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: mockCommits });

      const result = await githubService.getTopCodeContributor();

      expect(result).toBeNull();
    });

    it('should skip removed files', async () => {
      const mockFiles = [
        { filename: 'src/file1.ts', status: 'removed' },
        { filename: 'src/file2.ts', status: 'modified' }
      ];

      const mockCommits = [
        { author: { login: 'alice' } }
      ];

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({ data: mockFiles });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: mockCommits });

      await githubService.getTopCodeContributor();

      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledTimes(1);
      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'src/file2.ts',
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockOctokit.rest.pulls.listFiles.mockRejectedValue(new Error('API Error'));

      const result = await githubService.getTopCodeContributor();

      expect(result).toBeNull();
      expect(core.warning).toHaveBeenCalledWith(
        'Failed to analyze code contributors: Error: API Error'
      );
    });

    it('should filter by 6 month timeframe', async () => {
      const mockFiles = [
        { filename: 'src/file1.ts', status: 'modified' }
      ];

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({ data: mockFiles });
      mockOctokit.rest.repos.listCommits.mockResolvedValue({ data: [] });

      await githubService.getTopCodeContributor();

      // Check that the since parameter is set to 6 months ago
      const expectedSince = new Date('2023-07-15').toISOString(); // 6 months before mocked date
      expect(mockOctokit.rest.repos.listCommits).toHaveBeenCalledWith(
        expect.objectContaining({
          since: expectedSince,
          per_page: 30,
        })
      );
    });
  });

  describe('getOctokit and getContext', () => {
    it('should return octokit instance', () => {
      const octokit = githubService.getOctokit();
      expect(octokit).toBe(mockOctokit);
    });

    it('should return github context', () => {
      const context = githubService.getContext();
      expect(context).toBe(github.context);
    });
  });
});