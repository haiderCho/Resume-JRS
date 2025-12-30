export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export interface JobMatch {
  id: string;
  title: string;
  company: string;
  description: string;
  skills: string[];
  level: string;
  category: string;
  score: number;
  originalUrl?: string;
}

export function rankJobs(
  resumeEmbedding: number[],
  jobs: any[],
  topK: number = 10
): JobMatch[] {
  const scored = jobs.map(job => ({
    ...job,
    score: cosineSimilarity(resumeEmbedding, job.embedding)
  }));
  
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ embedding, ...job }) => job);
}
