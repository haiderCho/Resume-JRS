/**
 * Experience Level Detection Module
 * Infers candidate seniority from resume text and matches against job requirements.
 */

export type ExperienceLevel = 'intern' | 'entry' | 'mid' | 'senior' | 'lead' | 'principal';

export interface ExperienceAnalysis {
  level: ExperienceLevel;
  yearsOfExperience: number | null;
  confidence: number; // 0-1
  signals: string[];
}

const LEVEL_KEYWORDS: Record<ExperienceLevel, RegExp[]> = {
  intern: [/intern(ship)?/i, /student/i, /trainee/i],
  entry: [/junior/i, /entry[\s-]?level/i, /graduate/i, /associate/i],
  mid: [/mid[\s-]?level/i, /\b2-?4\s*years?\b/i, /\b3-?5\s*years?\b/i],
  senior: [/senior/i, /\b5\+?\s*years?\b/i, /\b6-?10\s*years?\b/i, /experienced/i],
  lead: [/lead/i, /team\s*lead/i, /tech\s*lead/i, /manager/i, /\b8\+?\s*years?\b/i],
  principal: [/principal/i, /staff/i, /architect/i, /director/i, /\b10\+?\s*years?\b/i]
};

/**
 * Extracts years of experience from resume text.
 * Returns the maximum years found or null if none detected.
 */
function extractYearsOfExperience(text: string): number | null {
  const patterns = [
    /(\d{1,2})\+?\s*years?\s*(of)?\s*(professional|work|industry)?\s*experience/gi,
    /experience:?\s*(\d{1,2})\+?\s*years?/gi,
    /(\d{1,2})\+?\s*years?\s*in\s*(the\s*)?(industry|field|tech)/gi
  ];

  let maxYears = 0;
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const years = parseInt(match[1], 10);
      if (years > maxYears && years <= 50) { // Sanity check
        maxYears = years;
      }
    }
  }

  return maxYears > 0 ? maxYears : null;
}

/**
 * Detects experience level from resume text.
 */
export function detectExperienceLevel(resumeText: string): ExperienceAnalysis {
  const signals: string[] = [];
  let level: ExperienceLevel = 'entry'; // Default
  let confidence = 0.3;

  // 1. Try to extract explicit years
  const yearsOfExperience = extractYearsOfExperience(resumeText);
  
  if (yearsOfExperience !== null) {
    signals.push(`Found ${yearsOfExperience}+ years of experience mentioned`);
    confidence = 0.8;

    if (yearsOfExperience >= 12) {
      level = 'principal';
    } else if (yearsOfExperience >= 8) {
      level = 'lead';
    } else if (yearsOfExperience >= 5) {
      level = 'senior';
    } else if (yearsOfExperience >= 2) {
      level = 'mid';
    } else {
      level = 'entry';
    }
  }

  // 2. Look for keyword signals in titles/descriptions
  for (const [lvl, patterns] of Object.entries(LEVEL_KEYWORDS) as [ExperienceLevel, RegExp[]][]) {
    for (const pattern of patterns) {
      if (pattern.test(resumeText)) {
        signals.push(`Keyword match: "${pattern.source}"`);
        
        // Only override if confidence is low or this is more senior
        const levelOrder: ExperienceLevel[] = ['intern', 'entry', 'mid', 'senior', 'lead', 'principal'];
        const currentIdx = levelOrder.indexOf(level);
        const matchIdx = levelOrder.indexOf(lvl);
        
        if (matchIdx > currentIdx && confidence < 0.7) {
          level = lvl;
          confidence = 0.6;
        }
        break; // One match per level is enough
      }
    }
  }

  // 3. Check for leadership indicators
  const leadershipPatterns = [
    /led\s+a?\s*team/i,
    /managed\s+\d+\s*(developers|engineers|people)/i,
    /mentored/i,
    /oversaw/i,
    /directed/i
  ];
  
  const leadershipCount = leadershipPatterns.filter(p => p.test(resumeText)).length;
  if (leadershipCount >= 2) {
    signals.push('Strong leadership signals detected');
    const levelOrder: ExperienceLevel[] = ['intern', 'entry', 'mid', 'senior', 'lead', 'principal'];
    const currentIdx = levelOrder.indexOf(level);
    if (currentIdx < levelOrder.indexOf('senior')) {
      level = 'senior';
      confidence = Math.max(confidence, 0.6);
    }
  }

  return {
    level,
    yearsOfExperience,
    confidence,
    signals
  };
}

/**
 * Checks if candidate level matches the job level.
 * Returns a score from 0-1 indicating match quality.
 */
export function matchExperienceLevel(
  candidateLevel: ExperienceLevel,
  jobLevel: string | undefined
): number {
  if (!jobLevel) return 0.8; // Neutral if job doesn't specify

  const lvlOrder: ExperienceLevel[] = ['intern', 'entry', 'mid', 'senior', 'lead', 'principal'];
  const candidateIdx = lvlOrder.indexOf(candidateLevel);
  
  // Normalize job level
  const normalizedJobLevel = jobLevel.toLowerCase();
  let jobIdx = -1;
  
  if (/intern|trainee/i.test(normalizedJobLevel)) jobIdx = 0;
  else if (/junior|entry|associate/i.test(normalizedJobLevel)) jobIdx = 1;
  else if (/mid|intermediate/i.test(normalizedJobLevel)) jobIdx = 2;
  else if (/senior/i.test(normalizedJobLevel)) jobIdx = 3;
  else if (/lead|manager/i.test(normalizedJobLevel)) jobIdx = 4;
  else if (/principal|staff|director/i.test(normalizedJobLevel)) jobIdx = 5;
  
  if (jobIdx === -1) return 0.8; // Unknown job level
  
  const distance = Math.abs(candidateIdx - jobIdx);
  
  // Score based on distance
  if (distance === 0) return 1.0;    // Perfect match
  if (distance === 1) return 0.85;   // One level off (acceptable)
  if (distance === 2) return 0.6;    // Two levels off (stretch)
  return 0.3;                         // More than two levels (mismatch)
}
