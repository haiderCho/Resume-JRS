/**
 * Job Quality Scoring Module
 * Filters low-quality job postings before ranking to improve match precision.
 */

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  skills?: string[];
  level?: string;
  postedDate?: string;
  embedding?: number[];
}

export interface QualityScore {
  score: number;        // 0-1 range
  breakdown: {
    descriptionLength: number;
    hasSkillsList: number;
    hasSeniority: number;
    hasCompany: number;
    specificity: number;
  };
  isValid: boolean;     // Above quality threshold
}

// Minimum quality threshold for including a job in results
const QUALITY_THRESHOLD = 0.4;

/**
 * Scores the quality of a job posting.
 * Higher scores indicate more detailed, parseable job descriptions.
 */
export function scoreJobQuality(job: Job): QualityScore {
  const breakdown = {
    descriptionLength: 0,
    hasSkillsList: 0,
    hasSeniority: 0,
    hasCompany: 0,
    specificity: 0
  };

  // 1. Description Length (0.3 weight)
  // Ideal range: 100-500 words
  const wordCount = (job.description || '').split(/\s+/).filter(Boolean).length;
  if (wordCount >= 100) breakdown.descriptionLength = 0.15;
  if (wordCount >= 200) breakdown.descriptionLength = 0.25;
  if (wordCount >= 350) breakdown.descriptionLength = 0.30;

  // 2. Has Skills List (0.25 weight)
  const skillCount = job.skills?.length || 0;
  if (skillCount >= 3) breakdown.hasSkillsList = 0.15;
  if (skillCount >= 5) breakdown.hasSkillsList = 0.25;

  // 3. Has Seniority Level (0.15 weight)
  const seniorityPatterns = /\b(junior|mid|senior|lead|principal|staff|entry|intern|associate)\b/i;
  if (job.level || seniorityPatterns.test(job.title)) {
    breakdown.hasSeniority = 0.15;
  }

  // 4. Has Company Name (0.1 weight)
  if (job.company && job.company.length > 2 && job.company.toLowerCase() !== 'unknown') {
    breakdown.hasCompany = 0.10;
  }

  // 5. Specificity - Contains measurable/concrete info (0.2 weight)
  const specificityPatterns = [
    /\d+\s*years?/i,              // X years experience
    /\$[\d,]+/,                    // Salary info
    /remote|hybrid|on-?site/i,    // Work arrangement
    /bachelor|master|phd|degree/i, // Education requirement
    /team of \d+/i,               // Team size
  ];
  const matchCount = specificityPatterns.filter(p => p.test(job.description)).length;
  breakdown.specificity = Math.min(matchCount * 0.05, 0.20);

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  return {
    score,
    breakdown,
    isValid: score >= QUALITY_THRESHOLD
  };
}

/**
 * Filters jobs to only include high-quality postings.
 * Returns jobs sorted by quality score (highest first).
 */
export function filterHighQualityJobs<T extends Job>(
  jobs: T[],
  threshold: number = QUALITY_THRESHOLD
): T[] {
  return jobs
    .map(job => ({ job, quality: scoreJobQuality(job) }))
    .filter(({ quality }) => quality.score >= threshold)
    .sort((a, b) => b.quality.score - a.quality.score)
    .map(({ job }) => job);
}

/**
 * Annotates jobs with quality metadata (useful for debugging/display).
 */
export function annotateJobsWithQuality<T extends Job>(
  jobs: T[]
): (T & { qualityScore: QualityScore })[] {
  return jobs.map(job => ({
    ...job,
    qualityScore: scoreJobQuality(job)
  }));
}
