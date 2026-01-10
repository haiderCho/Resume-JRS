import taxonomy from '@/data/skills-taxonomy.json';
import { cleanText } from './text-extraction';

type SkillCategory = keyof typeof taxonomy.categories;

export interface SkillAnalysis {
  found: string[];
  byCategory: Record<string, string[]>;
  totalCount: number;
}

// Optimization: Flatten the taxonomy for O(1) lookups or regex generation
const SKILL_SET = new Set<string>();
const SKILL_TO_CATEGORY = new Map<string, string>();

// Initialize optimization structures
Object.entries(taxonomy.categories).forEach(([category, skills]) => {
  skills.forEach(skill => {
    const normalized = skill.toLowerCase();
    SKILL_SET.add(normalized);
    SKILL_TO_CATEGORY.set(normalized, category);
  });
});

export function extractSkills(text: string): SkillAnalysis {
  const normalizedText = text.toLowerCase();
  // Simple tokenization: Split by non-word chars but keep potential multi-word skills intact in logic
  // We'll iterate the taxonomy instead of the text for accuracy on multi-word skills like "React Native" (if we had it)
  
  const foundSkills = new Set<string>();
  const byCategory: Record<string, string[]> = {};

  // Initialize categories
  Object.keys(taxonomy.categories).forEach(cat => byCategory[cat] = []);

  // Check existence of each skill in text
  // NOTE: This is O(Skills * TextLength) which is acceptable for < 1000 skills and short text.
  // For production, Aho-Corasick or Regex optimization is better.
  SKILL_SET.forEach((skill) => {
    // Exact word matching using regex boundary to avoid "Java" matching in "Javascript" if we just did .includes()
    // However, for "C++" \b doesn't work well.
    // We will use a flexible check.
    
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let pattern: RegExp;
    
    if (['c++', 'c#', '.net'].includes(skill)) {
       pattern = new RegExp(escapedSkill, 'i'); // Relaxed for special chars
    } else {
       pattern = new RegExp(`\\b${escapedSkill}\\b`, 'i');
    }

    if (pattern.test(text)) {
      // Get the original casing from the taxonomy implies mapping back or just using the normalized key
      // Let's store the display version.
      // We need a map from normalized -> Original. 
      // For now, we will just capitalize.
      const category = SKILL_TO_CATEGORY.get(skill);
      if (category) {
        // Find the original casing from taxonomy
        const originalName = taxonomy.categories[category as SkillCategory].find(s => s.toLowerCase() === skill) || skill;
        if (!foundSkills.has(originalName)) {
            foundSkills.add(originalName);
            byCategory[category].push(originalName);
        }
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
  const resumeSet = new Set(resumeSkills);
  const jobSet = new Set(jobSkills);

  const missing = jobSkills.filter(s => !resumeSet.has(s));
  const matching = jobSkills.filter(s => resumeSet.has(s));
  
  // Extra skills are present in resume but not in job
  const extra = resumeSkills.filter(s => !jobSet.has(s));

  return {
    missing,
    matching,
    extra,
    matchPercentage: jobSkills.length > 0 ? (matching.length / jobSkills.length) * 100 : 0
  };
}
