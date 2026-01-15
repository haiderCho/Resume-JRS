import { describe, it, expect } from 'vitest';
import { computeWeightedScore, computeEnsembleScore } from '../lib/weighted-scoring';

describe('computeWeightedScore', () => {
  const mockJobEmbedding = Array(384).fill(0.1);

  it('should fallback to global score when no sections available', () => {
    const result = computeWeightedScore(
      { experience: null, skills: null, education: null },
      mockJobEmbedding,
      0.75
    );

    expect(result.strategy).toBe('fallback');
    expect(result.finalScore).toBe(0.75);
    expect(result.availableSections).toHaveLength(0);
  });

  it('should use weighted strategy when all sections available', () => {
    const result = computeWeightedScore(
      {
        experience: Array(384).fill(0.1),
        skills: Array(384).fill(0.1),
        education: Array(384).fill(0.1)
      },
      mockJobEmbedding,
      0.5
    );

    expect(result.strategy).toBe('weighted');
    expect(result.availableSections).toHaveLength(3);
  });

  it('should normalize weights for partial sections', () => {
    const result = computeWeightedScore(
      {
        experience: Array(384).fill(0.1),
        skills: null,
        education: null
      },
      mockJobEmbedding,
      0.5
    );

    // Only experience available (weight 0.5), normalized to 1.0
    expect(result.availableSections).toContain('experience');
    expect(result.availableSections).toHaveLength(1);
  });

  it('should fallback for empty job embedding', () => {
    const result = computeWeightedScore(
      {
        experience: Array(384).fill(0.1),
        skills: Array(384).fill(0.1),
        education: Array(384).fill(0.1)
      },
      [],
      0.6
    );

    expect(result.strategy).toBe('fallback');
    expect(result.finalScore).toBe(0.6);
  });
});

describe('computeEnsembleScore', () => {
  it('should combine semantic, skill, and level scores', () => {
    const weightedResult = {
      finalScore: 0.8,
      sectionScores: { experience: 0.7, skills: 0.9, education: 0.6 },
      strategy: 'weighted' as const,
      availableSections: ['experience', 'skills', 'education'] as ('experience' | 'skills' | 'education')[]
    };

    const ensembleScore = computeEnsembleScore(weightedResult, 70, true);

    // 0.55 * 0.8 + 0.30 * 0.7 + 0.15 * 1.0 = 0.44 + 0.21 + 0.15 = 0.8
    expect(ensembleScore).toBeCloseTo(0.8, 1);
  });

  it('should penalize level mismatch', () => {
    const weightedResult = {
      finalScore: 0.8,
      sectionScores: { experience: 0.7, skills: 0.9, education: 0.6 },
      strategy: 'weighted' as const,
      availableSections: ['experience', 'skills', 'education'] as ('experience' | 'skills' | 'education')[]
    };

    const withMatch = computeEnsembleScore(weightedResult, 70, true);
    const withoutMatch = computeEnsembleScore(weightedResult, 70, false);

    expect(withMatch).toBeGreaterThan(withoutMatch);
  });
});
