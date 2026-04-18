import taxonomy from '@/data/skills-taxonomy.json';
import { cleanText } from './text-extraction';

type SkillCategory = keyof typeof taxonomy.categories;

export interface SkillAnalysis {
  found: string[];
  byCategory: Record<string, string[]>;
  totalCount: number;
}

// Optimization: Flatten the taxonomy for lookups
const SKILL_DATA: Array<{ original: string, normalized: string, category: string }> = [];

Object.entries(taxonomy.categories).forEach(([category, skills]) => {
  skills.forEach(skill => {
    SKILL_DATA.push({
      original: skill,
      normalized: skill.toLowerCase(),
      category: category as string
    });
  });
});

const AMBIGUOUS_SKILLS = new Set(['go', 'rust', 'swift', 'r', 'c', 'lean', 'move', 'less']);

export function extractSkills(text: string): SkillAnalysis {
  const foundSkills = new Set<string>();
  const byCategory: Record<string, string[]> = {};

  Object.keys(taxonomy.categories).forEach(cat => byCategory[cat] = []);

  SKILL_DATA.forEach(({ original, normalized, category }) => {
    const escapedSkill = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let pattern: RegExp;
    
    if (AMBIGUOUS_SKILLS.has(normalized)) {
      // Match original casing (Go) or ALL CAPS (GO)
      // BUT: Guard against sentence starters (e.g., "Move to...", "Less than...")
      // We look for: (Start of Line OR Period Space) followed by Skill followed by a lowercase word
      const sentenceStarter = new RegExp(`(^|[.\\?!]\\s+)(${original}|${original.toUpperCase()})\\s+[a-z]`);
      if (sentenceStarter.test(text)) {
        return; // Ignore if it looks like a common sentence starter
      }
      pattern = new RegExp(`\\b(${escapedSkill}|${original.toUpperCase()})\\b`);
    } else if (['c++', 'c#', '.net'].includes(normalized)) {
      pattern = new RegExp(escapedSkill, 'i'); 
    } else {
      pattern = new RegExp(`\\b${escapedSkill}\\b`, 'i');
    }

    if (pattern.test(text)) {
      if (!foundSkills.has(original)) {
        foundSkills.add(original);
        byCategory[category].push(original);
      }
    }
  });

  return {
    found: Array.from(foundSkills),
    byCategory,
    totalCount: foundSkills.size
  };
}

export function analyzeGap(resumeSkills: string[], jobSkills: string[]) {
  // Use normalized versions for comparison to handle aliases (React vs ReactJS)
  const normalize = (s: string) => s.toLowerCase().replace(/[.\s-]/g, '');
  
  const resumeNormalized = new Set(resumeSkills.map(normalize));
  const jobNormalized = new Set(jobSkills.map(normalize));

  const missing = jobSkills.filter(s => !resumeNormalized.has(normalize(s)));
  const matching = jobSkills.filter(s => resumeNormalized.has(normalize(s)));
  
  // Extra skills are present in resume but not in job
  const extra = resumeSkills.filter(s => !jobNormalized.has(normalize(s)));

  return {
    missing,
    matching,
    extra,
    matchPercentage: jobSkills.length > 0 ? (matching.length / jobSkills.length) * 100 : 0
  };
}
