import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';
import { extractTextFromPDF, extractTextFromDOCX, cleanText } from '@/lib/text-extraction';
import { rankJobs } from '@/lib/similarity';
import { extractSkills, analyzeGap } from '@/lib/skills-extraction';
import { computePCA } from '@/lib/pca';
import jobsData from '@/data/jobs-with-embeddings.json';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: NextRequest) {
  console.log('API /recommend hit');
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // 1. Extract Text
    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText: string;
    
    if (file.name.endsWith('.pdf')) {
      resumeText = await extractTextFromPDF(buffer);
    } else if (file.name.endsWith('.docx')) {
      resumeText = await extractTextFromDOCX(buffer);
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }
    
    const cleanedText = cleanText(resumeText);
    
    // 2. Generate Embedding
    let resumeEmbedding: number[];
    try {
        if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY === 'your_key_here') {
             throw new Error("Missing Key");
        }
        const output = await hf.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: cleanedText
        });
        resumeEmbedding = Array.from(output) as number[];
    } catch (e) {
        console.warn("API Error, using mock embedding:", e);
        resumeEmbedding = Array.from({length: 384}, () => Math.random() - 0.5);
    }
    
    // 3. Rank Jobs
    // @ts-ignore
    const matches = rankJobs(resumeEmbedding, jobsData, 50); // Get top 50 for good PCA plot
    const topMatches = matches.slice(0, 10); // Return top 10 for list

    // 4. Skill Analysis (Feature 1)
    const resumeSkills = extractSkills(cleanedText);
    
    const enhancedMatches = topMatches.map(job => {
      const jobText = `${job.title} ${job.description}`;
      const jobSkills = extractSkills(jobText);
      const gap = analyzeGap(resumeSkills.found, jobSkills.found);
      
      return {
        ...job,
        analysis: {
          missingSkills: gap.missing,
          matchedSkills: gap.matching,
          extraSkills: gap.extra,
          matchPercentage: gap.matchPercentage
        }
      };
    });

    // 5. PCA Visualization (Feature 2)
    // Prepare matrix: [Resume, ...Top50Jobs]
    const matrix = [resumeEmbedding, ...matches.map(m => m.embedding)];
    // @ts-ignore
    const coordinates = computePCA(matrix);
    
    const visualizationData = {
      user: coordinates[0],
      jobs: matches.map((job, i) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        x: coordinates[i + 1].x,
        y: coordinates[i + 1].y,
        score: job.score,
        isTopMatch: i < 10
      }))
    };

    return NextResponse.json({
      success: true,
      matches: enhancedMatches,
      visualization: visualizationData,
      resumePreview: cleanedText.substring(0, 200) + '...'
    });
    
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process resume', details: error.message },
      { status: 500 }
    );
  }
}


