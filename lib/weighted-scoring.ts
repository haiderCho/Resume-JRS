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
 */
export function computeWeightedScore(
  sectionEmbeddings: SectionEmbeddings,
  jobEmbedding: number[],
  globalScore: number
): WeightedScoreResult {
  if (!jobEmbedding || jobEmbedding.length === 0) {
    return {
      finalScore: globalScore,
      sectionScores: { experience: 0, skills: 0, education: 0 },
      strategy: 'fallback',
      availableSections: []
    };
  }

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

  if (availableSections.length === 0) {
    return {
      finalScore: globalScore,
      sectionScores,
      strategy: 'fallback',
      availableSections
    };
  }

  const totalAvailableWeight = availableSections.reduce(
    (sum, key) => sum + SECTION_WEIGHTS[key],
    0
  );

  let weightedScore = 0;
  for (const key of availableSections) {
    const normalizedWeight = SECTION_WEIGHTS[key] / totalAvailableWeight;
    weightedScore += sectionScores[key] * normalizedWeight;
  }

  if (totalAvailableWeight < 0.3) {
    const blendedScore = (0.7 * globalScore) + (0.3 * weightedScore);
    return {
      finalScore: blendedScore,
      sectionScores,
      strategy: 'blended',
      availableSections
    };
  }

  return {
    finalScore: weightedScore,
    sectionScores,
    strategy: 'weighted',
    availableSections
  };
}

/**
 * Enhanced scoring that also considers skill overlap.
 */
export function computeEnsembleScore(
  weightedResult: WeightedScoreResult,
  skillMatchPercentage: number,
  levelMatch: boolean = true
): number {
  const ENSEMBLE_WEIGHTS = {
    semantic: 0.55,
    skills: 0.30,
    levelBonus: 0.15
  };

  const semanticScore = weightedResult.finalScore;
  const skillScore = skillMatchPercentage / 100;
  const levelBonus = levelMatch ? 1.0 : 0.6;

  // Power-based scaling (s^0.7) to boost mid-range AI scores
  // This makes 0.6 (Good) -> ~0.7 (Intuitive Good)
  const scale = (s: number) => {
    if (s <= 0.3) return s * 0.5;
    const normalized = Math.max(0, (s - 0.3) / 0.65);
    return Math.pow(normalized, 0.4);
  };

  const finalScore = (
    (ENSEMBLE_WEIGHTS.semantic * scale(semanticScore)) +
    (ENSEMBLE_WEIGHTS.skills * skillScore) +
    (ENSEMBLE_WEIGHTS.levelBonus * levelBonus)
  );

  // Boost for core matches
  const coreBonus = (skillScore > 0.4 && semanticScore > 0.5) ? 0.05 : 0;

  return Math.min(1.0, Math.round((finalScore + coreBonus) * 100) / 100);
}
