import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';
import { extractTextFromPDF, extractTextFromDOCX, cleanText, splitIntoChunks, parseResumeStructure } from '@/lib/text-extraction';
import { rankJobs, cosineSimilarity } from '@/lib/similarity';
import { extractSkills, analyzeGap } from '@/lib/skills-extraction';
import { computePCA } from '@/lib/pca';
import jobsData from '@/data/jobs-with-embeddings.json';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Extract Text
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
    
    // Generate Embedding using Smart Chunking
    let resumeEmbedding: number[];
    try {
        if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY === 'your_key_here') {
             throw new Error("Missing Key");
        }

        const chunks = splitIntoChunks(cleanedText, 200, 50);
        console.log(`Processing ${chunks.length} chunks...`);

        if (chunks.length === 1) {
             const output = await hf.featureExtraction({
                 model: 'sentence-transformers/all-MiniLM-L6-v2',
                 inputs: chunks[0]
             });
             resumeEmbedding = Array.from(output) as number[];
        } else {
             const requests = chunks.map(chunk => hf.featureExtraction({
                 model: 'sentence-transformers/all-MiniLM-L6-v2',
                 inputs: chunk
             }));
             
             const responses = await Promise.all(requests);
             const combined = new Array(384).fill(0);
             
             responses.forEach(resp => {
                 const vec = Array.from(resp as number[]);
                 for(let i=0; i<384; i++) combined[i] += vec[i];
             });
             
             resumeEmbedding = combined.map(val => val / chunks.length);
        }

    } catch (e) {
        console.warn("Embedding API Error (using mock):", e);
        resumeEmbedding = Array.from({length: 384}, () => Math.random() - 0.5);
    }
    
    // Rank Jobs
    const matches = rankJobs(resumeEmbedding, jobsData, 50);
    const topMatches = matches.slice(0, 10);

    // Skill Analysis
    const resumeSkills = extractSkills(cleanedText);
    
    // Structure Parsing & Detailed Scoring
    const structure = parseResumeStructure(resumeText);
    
    const sectionEmbeddings: Record<string, number[]> = {};
    if (structure.experience.length > 50) {
         try {
            const out = await hf.featureExtraction({ model: 'sentence-transformers/all-MiniLM-L6-v2', inputs: structure.experience });
            sectionEmbeddings.experience = Array.from(out) as number[];
         } catch(e) { /* Ignore section error */ }
    }
    if (structure.skills.length > 20) {
         try {
            const out = await hf.featureExtraction({ model: 'sentence-transformers/all-MiniLM-L6-v2', inputs: structure.skills });
            sectionEmbeddings.skills = Array.from(out) as number[];
         } catch(e) { /* Ignore section error */ }
    }
    
    const enhancedMatches = topMatches.map(job => {
      const jobText = `${job.title} ${job.description}`;
      const jobSkills = extractSkills(jobText);
      const gap = analyzeGap(resumeSkills.found, jobSkills.found);
      
      const expVec = sectionEmbeddings.experience;
      const skillVec = sectionEmbeddings.skills;
      
      const sectionScores = {
          experience: expVec ? cosineSimilarity(expVec, (job.embedding || []) as number[]) : 0,
          skills: skillVec ? cosineSimilarity(skillVec, (job.embedding || []) as number[]) : 0
      };

      return {
        ...job,
        analysis: {
          missingSkills: gap.missing,
          matchedSkills: gap.matching,
          extraSkills: gap.extra,
          matchPercentage: gap.matchPercentage,
          sectionScores
        }
      };
    });

    // PCA Visualization
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
      structure, // Return parsed structure for debugging/display
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


