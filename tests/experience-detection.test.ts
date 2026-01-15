import { describe, it, expect } from 'vitest';
import { detectExperienceLevel, matchExperienceLevel } from '../lib/experience-detection';

describe('detectExperienceLevel', () => {
  it('should detect senior level from years of experience', () => {
    const result = detectExperienceLevel('I have 7+ years of experience in software development.');
    
    expect(result.level).toBe('senior');
    expect(result.yearsOfExperience).toBe(7);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should detect entry level for fresh graduates', () => {
    const result = detectExperienceLevel('Recent computer science graduate looking for junior developer role.');
    
    expect(result.level).toBe('entry');
  });

  it('should detect lead level from leadership keywords', () => {
    const result = detectExperienceLevel(
      'Led a team of 8 engineers. 10+ years of professional experience. Mentored junior developers.'
    );
    
    expect(['lead', 'principal']).toContain(result.level);
    expect(result.yearsOfExperience).toBeGreaterThanOrEqual(10);
  });

  it('should return entry as default for ambiguous resumes', () => {
    const result = detectExperienceLevel('Skills: Python, JavaScript, React');
    
    expect(result.level).toBe('entry');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('should extract correct years from various formats', () => {
    const cases = [
      { text: '5 years of experience', expected: 5 },
      { text: '3+ years in tech', expected: 3 },
      { text: 'Experience: 8 years', expected: 8 },
    ];

    for (const { text, expected } of cases) {
      const result = detectExperienceLevel(text);
      expect(result.yearsOfExperience).toBe(expected);
    }
  });
});

describe('matchExperienceLevel', () => {
  it('should return 1.0 for perfect level match', () => {
    expect(matchExperienceLevel('senior', 'Senior')).toBe(1.0);
    expect(matchExperienceLevel('entry', 'Junior')).toBe(1.0);
  });

  it('should return 0.85 for one level difference', () => {
    expect(matchExperienceLevel('mid', 'Senior')).toBe(0.85);
    expect(matchExperienceLevel('senior', 'mid-level')).toBe(0.85);
  });

  it('should return lower score for large level gaps', () => {
    const score = matchExperienceLevel('entry', 'Senior');
    expect(score).toBeLessThan(0.7);
  });

  it('should return 0.8 when job level is undefined', () => {
    expect(matchExperienceLevel('senior', undefined)).toBe(0.8);
    expect(matchExperienceLevel('entry', '')).toBe(0.8);
  });
});
