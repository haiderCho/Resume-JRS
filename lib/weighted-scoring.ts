import { cosineSimilarity } from './similarity';

/**
 * Weights for section-based scoring.
 * Experience is prioritized as it's the strongest signal for job fit.
 */
const SECTION_WEIGHTS = {
  experience: 0.5,
  skills: 0.3,
  education: 0.2
} as const;

type SectionKey = keyof typeof SECTION_WEIGHTS;

export interface SectionEmbeddings {
  experience?: number[] | null;
  skills?: number[] | null;
  education?: number[] | null;
}

export interface WeightedScoreResult {
  finalScore: number;
  sectionScores: {
    experience: number;
    skills: number;
    education: number;
  };
  strategy: 'weighted' | 'blended' | 'fallback';
  availableSections: SectionKey[];
}

/**
 * Computes a weighted score based on available resume sections.
 * 
 * Strategy:
 * 1. If all sections available: Pure weighted formula (0.5*Exp + 0.3*Skills + 0.2*Edu)
 * 2. If partial sections: Normalize weights to available sections only
 * 3. If <30% coverage: Blend with global score (70% global + 30% partial)
 * 4. If no sections: Full fallback to global cosine similarity
 * 
 * @param sectionEmbeddings - Embeddings for each resume section (can be null/undefined)
 * @param jobEmbedding - The job's embedding vector
 * @param globalScore - The original full-document cosine similarity score
 * @returns WeightedScoreResult with final score and metadata
 */
export function computeWeightedScore(
  sectionEmbeddings: SectionEmbeddings,
  jobEmbedding: number[],
  globalScore: number
): WeightedScoreResult {
  // Guard against empty job embedding
  if (!jobEmbedding || jobEmbedding.length === 0) {
    return {
      finalScore: globalScore,
      sectionScores: { experience: 0, skills: 0, education: 0 },
      strategy: 'fallback',
      availableSections: []
    };
  }

  // Identify which sections have valid embeddings
  const availableSections: SectionKey[] = [];
  const sectionScores: Record<SectionKey, number> = {
    experience: 0,
    skills: 0,
    education: 0
  };

  for (const key of Object.keys(SECTION_WEIGHTS) as SectionKey[]) {
    const embedding = sectionEmbeddings[key];
    if (embedding && embedding.length > 0) {
      availableSections.push(key);
      sectionScores[key] = cosineSimilarity(embedding, jobEmbedding);
    }
  }

  // Strategy 4: No sections detected -> Full fallback
  if (availableSections.length === 0) {
    return {
      finalScore: globalScore,
      sectionScores,
      strategy: 'fallback',
      availableSections
    };
  }

  // Calculate total available weight
  const totalAvailableWeight = availableSections.reduce(
    (sum, key) => sum + SECTION_WEIGHTS[key],
    0
  );

  // Calculate weighted score with normalized weights
  let weightedScore = 0;
  for (const key of availableSections) {
    const normalizedWeight = SECTION_WEIGHTS[key] / totalAvailableWeight;
    weightedScore += sectionScores[key] * normalizedWeight;
  }

  // Strategy 3: Less than 30% coverage -> Blend with global
  // This handles cases where only 1 weak section is detected
  if (totalAvailableWeight < 0.3) {
    const blendedScore = (0.7 * globalScore) + (0.3 * weightedScore);
    return {
      finalScore: blendedScore,
      sectionScores,
      strategy: 'blended',
      availableSections
    };
  }

  // Strategy 1 & 2: Sufficient coverage -> Use weighted score
  return {
    finalScore: weightedScore,
    sectionScores,
    strategy: totalAvailableWeight === 1.0 ? 'weighted' : 'weighted',
    availableSections
  };
}

/**
 * Enhanced scoring that also considers skill overlap.
 * Can be used for ensemble ranking in future phases.
 */
export function computeEnsembleScore(
  weightedResult: WeightedScoreResult,
  skillMatchPercentage: number,
  levelMatch: boolean = true
): number {
  // Ensemble weights (can be tuned)
  const ENSEMBLE_WEIGHTS = {
    semantic: 0.55,    // Weighted cosine similarity
    skills: 0.30,      // Skill gap analysis
    levelBonus: 0.15   // Experience level alignment
  };

  const semanticScore = weightedResult.finalScore;
  const skillScore = skillMatchPercentage / 100; // Normalize to 0-1
  const levelBonus = levelMatch ? 1.0 : 0.5;     // Penalty for mismatch

  return (
    (ENSEMBLE_WEIGHTS.semantic * semanticScore) +
    (ENSEMBLE_WEIGHTS.skills * skillScore) +
    (ENSEMBLE_WEIGHTS.levelBonus * levelBonus)
  );
}
