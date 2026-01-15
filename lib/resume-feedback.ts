/**
 * Resume Feedback Module
 * Generates actionable improvement suggestions for resumes.
 */

import { SkillAnalysis } from './skills-extraction';
import { ExperienceAnalysis } from './experience-detection';
import { ResumeSections } from './text-extraction';

export type SuggestionSeverity = 'critical' | 'warning' | 'tip';
export type SuggestionCategory = 'skills' | 'experience' | 'education' | 'format' | 'content';

export interface Suggestion {
  category: SuggestionCategory;
  severity: SuggestionSeverity;
  title: string;
  message: string;
  example?: string;
}

export interface ResumeFeedback {
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  suggestions: Suggestion[];
  strengths: string[];
  summary: string;
}

/**
 * Analyzes resume and generates improvement feedback.
 */
export function generateResumeFeedback(
  resumeText: string,
  structure: ResumeSections,
  skillAnalysis: SkillAnalysis,
  experienceAnalysis: ExperienceAnalysis,
  topJobSkills: string[] = []
): ResumeFeedback {
  const suggestions: Suggestion[] = [];
  const strengths: string[] = [];
  let score = 50; // Start at neutral

  // 1. SKILLS ANALYSIS
  const skillCount = skillAnalysis.totalCount;
  
  if (skillCount === 0) {
    suggestions.push({
      category: 'skills',
      severity: 'critical',
      title: 'No Skills Detected',
      message: 'No technical skills were detected. Add a dedicated "Skills" section.',
      example: 'Skills: Python, React, AWS, Docker, PostgreSQL'
    });
    score -= 20;
  } else if (skillCount < 5) {
    suggestions.push({
      category: 'skills',
      severity: 'warning',
      title: 'Limited Skills Listed',
      message: `Only ${skillCount} skills detected. Consider adding more relevant technologies.`
    });
    score -= 10;
  } else if (skillCount >= 10) {
    strengths.push(`Strong technical profile with ${skillCount} skills identified`);
    score += 10;
  }

  // Check for missing high-demand skills from target jobs
  if (topJobSkills.length > 0) {
    const resumeSkillsLower = new Set(skillAnalysis.found.map(s => s.toLowerCase()));
    const missingHighDemand = topJobSkills
      .filter(s => !resumeSkillsLower.has(s.toLowerCase()))
      .slice(0, 5);
    
    if (missingHighDemand.length > 0) {
      suggestions.push({
        category: 'skills',
        severity: 'warning',
        title: 'Missing In-Demand Skills',
        message: `Consider adding these high-demand skills if you have them:`,
        example: missingHighDemand.join(', ')
      });
    }
  }

  // 2. EXPERIENCE ANALYSIS
  if (!structure.experience || structure.experience.length < 100) {
    suggestions.push({
      category: 'experience',
      severity: 'critical',
      title: 'Experience Section Missing or Sparse',
      message: 'The experience section is too short or missing. Add detailed work history.',
      example: 'Include company, title, dates, and 3-5 bullet points per role'
    });
    score -= 15;
  } else {
    // Check for quantified achievements
    const hasMetrics = /\d+%|\$[\d,]+|\d+\s*(users|customers|clients|projects|team)/i.test(structure.experience);
    
    if (!hasMetrics) {
      suggestions.push({
        category: 'experience',
        severity: 'warning',
        title: 'Add Quantified Achievements',
        message: 'Use numbers to demonstrate impact in your experience.',
        example: '"Improved API performance by 40%" or "Led team of 5 engineers"'
      });
      score -= 5;
    } else {
      strengths.push('Experience includes quantified achievements');
      score += 10;
    }

    // Check for action verbs
    const actionVerbs = /\b(developed|built|designed|implemented|led|managed|created|optimized|improved|launched|deployed|architected|mentored|scaled)\b/i;
    if (actionVerbs.test(structure.experience)) {
      strengths.push('Uses strong action verbs');
      score += 5;
    } else {
      suggestions.push({
        category: 'content',
        severity: 'tip',
        title: 'Use Action Verbs',
        message: 'Start bullet points with strong action verbs.',
        example: 'Developed, Implemented, Led, Optimized, Architected'
      });
    }
  }

  // 3. EDUCATION ANALYSIS
  if (!structure.education || structure.education.length < 30) {
    suggestions.push({
      category: 'education',
      severity: 'tip',
      title: 'Education Section Light',
      message: 'Consider adding education details if relevant (degree, institution, graduation year).'
    });
  } else {
    const hasDegree = /bachelor|master|phd|b\.s\.|m\.s\.|mba|associate/i.test(structure.education);
    if (hasDegree) {
      strengths.push('Education credentials clearly listed');
      score += 5;
    }
  }

  // 4. FORMAT & LENGTH ANALYSIS  
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  
  if (wordCount < 150) {
    suggestions.push({
      category: 'format',
      severity: 'critical',
      title: 'Resume Too Short',
      message: `Only ~${wordCount} words detected. Resumes should be 300-800 words for optimal parsing.`
    });
    score -= 15;
  } else if (wordCount > 1200) {
    suggestions.push({
      category: 'format',
      severity: 'warning',
      title: 'Resume May Be Too Long',
      message: 'Consider condensing to 1-2 pages. Focus on the most relevant experience.'
    });
    score -= 5;
  } else {
    strengths.push('Resume length is appropriate');
    score += 5;
  }

  // Check for contact info indicators
  const hasContactInfo = /email|@|linkedin|github|phone|\(\d{3}\)/i.test(resumeText);
  if (!hasContactInfo) {
    suggestions.push({
      category: 'format',
      severity: 'warning',
      title: 'Contact Information May Be Missing',
      message: 'Ensure your email, LinkedIn, and phone are clearly visible.'
    });
  }

  // 5. EXPERIENCE LEVEL CONFIDENCE
  if (experienceAnalysis.confidence < 0.5) {
    suggestions.push({
      category: 'experience',
      severity: 'tip',
      title: 'Experience Level Unclear',
      message: 'Consider explicitly mentioning years of experience.',
      example: '"5+ years of experience in full-stack development"'
    });
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine grade
  let grade: ResumeFeedback['grade'];
  if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  // Generate summary
  const criticalCount = suggestions.filter(s => s.severity === 'critical').length;
  let summary: string;
  
  if (criticalCount > 0) {
    summary = `Your resume has ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} that may significantly impact your job search. Address these first.`;
  } else if (suggestions.length > 3) {
    summary = 'Your resume is solid but has room for improvement. Review the suggestions below.';
  } else if (strengths.length >= 3) {
    summary = 'Excellent resume! Just a few minor optimizations to consider.';
  } else {
    summary = 'Good foundation. Focus on adding more quantified achievements and skills.';
  }

  return {
    overallScore: score,
    grade,
    suggestions: suggestions.sort((a, b) => {
      const order = { critical: 0, warning: 1, tip: 2 };
      return order[a.severity] - order[b.severity];
    }),
    strengths,
    summary
  };
}
