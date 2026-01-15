// @ts-ignore
const pdf = require('pdf-parse');
import mammoth from 'mammoth';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // @ts-ignore
  const data = await pdf(buffer);
  return data.text;
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?-]/g, '')
    .trim();
}

/**
 * Splits text into overlapping chunks to handle token limits.
 * Default: ~200 words per chunk with 50 word overlap.
 */
export function splitIntoChunks(text: string, chunkSize: number = 200, overlap: number = 50): string[] {
  const words = text.split(' ');
  if (words.length <= chunkSize) return [text];
  
  const chunks: string[] = [];
  let i = 0;
  
  while (i < words.length) {
    const end = Math.min(i + chunkSize, words.length);
    const chunk = words.slice(i, end).join(' ');
    chunks.push(chunk);
    
    if (end === words.length) break;
    i += (chunkSize - overlap);
  }
  
  return chunks;
}

export interface ResumeSections {
  experience: string;
  education: string;
  skills: string;
  projects: string;
  summary: string;
}

/**
 * Heuristic parser to segment resume into key sections.
 * Relies on common header patterns (e.g. "Experience", "Work History").
 */
export function parseResumeStructure(text: string): ResumeSections {
  const sections: ResumeSections = {
    experience: '',
    education: '',
    skills: '',
    projects: '',
    summary: ''
  };

  // Convert to lines to easier identify headers
  const lines = text.split(/\r?\n/);
  let currentSection: keyof ResumeSections = 'summary';

  // Common Headers Regex - Extended with many common variations
  const headers = {
    experience: /^(work\s*)?(experience|history|employment|career|positions?\s*held|professional\s*background)/i,
    education: /^(education|academic|qualifications?|degrees?|schooling|university|college|certifications?|training)/i,
    skills: /^(skills?|technical\s*skills?|technologies|tech\s*stack|tools|competenc(ies|y)|expertise|proficienc(ies|y)|capabilities)/i,
    projects: /^(projects?|portfolio|personal\s*projects?|side\s*projects?|achievements?|accomplishments?)/i
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line is a header
    // Heuristic: Short line (under 5 words), matches keyword
    if (trimmed.split(/\s+/).length < 6) {
       if (headers.experience.test(trimmed)) { currentSection = 'experience'; continue; }
       if (headers.education.test(trimmed)) { currentSection = 'education'; continue; }
       if (headers.skills.test(trimmed)) { currentSection = 'skills'; continue; }
       if (headers.projects.test(trimmed)) { currentSection = 'projects'; continue; }
    }

    sections[currentSection] += line + '\n';
  }

  return sections;
}
