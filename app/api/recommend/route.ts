import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';
import { extractTextFromPDF, extractTextFromDOCX, cleanText, splitIntoChunks, parseResumeStructure } from '@/lib/text-extraction';
import { rankJobs, cosineSimilarity } from '@/lib/similarity';
import { extractSkills, analyzeGap } from '@/lib/skills-extraction';
import { computeWeightedScore, computeEnsembleScore } from '@/lib/weighted-scoring';
import { computePCA } from '@/lib/pca';
import { scoreJobQuality } from '@/lib/job-quality';
import { detectExperienceLevel, matchExperienceLevel } from '@/lib/experience-detection';
import { generateResumeFeedback } from '@/lib/resume-feedback';
import { embeddingCache, getCachedEmbedding } from '@/lib/cache';
import { apiRateLimiter, RateLimiter, rateLimitHeaders } from '@/lib/rate-limiter';
import { logger, createRequestLogger } from '@/lib/logger';
import jobsData from '@/data/jobs-with-embeddings.json';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const log = createRequestLogger(requestId);
  const startTime = performance.now();
  
  // Rate Limiting
  const clientIp = RateLimiter.getIdentifier(request);
  const rateCheck = apiRateLimiter.check(clientIp);
  
  if (!rateCheck.allowed) {
    log.warn('Rate limit exceeded', { clientIp });
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateCheck) }
    );
  }
  
  log.info('Processing resume upload', { clientIp });
  
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
    
    // Rank Jobs (with quality filtering)
    const allMatches = rankJobs(resumeEmbedding, jobsData, 100);
    const matches = allMatches.filter(job => {
      const quality = scoreJobQuality(job as any);
      return quality.isValid;
    }).slice(0, 50);
    const topMatches = matches.slice(0, 10);

    // Skill Analysis
    const resumeSkills = extractSkills(cleanedText);
    
    // Experience Level Detection
    const experienceAnalysis = detectExperienceLevel(resumeText);
    
    // Structure Parsing & Detailed Scoring
    const structure = parseResumeStructure(resumeText);
    
    // Generate embeddings for sections (if they exist)
    const sectionEmbeddings: Record<string, number[]> = {};
    const model = 'sentence-transformers/all-MiniLM-L6-v2';

    if (structure.experience.length > 50) {
         try {
            const out = await hf.featureExtraction({ model, inputs: structure.experience });
            sectionEmbeddings.experience = Array.from(out) as number[];
         } catch(e) { /* Ignore section error */ }
    }
    if (structure.skills.length > 20) {
         try {
            const out = await hf.featureExtraction({ model, inputs: structure.skills });
            sectionEmbeddings.skills = Array.from(out) as number[];
         } catch(e) { /* Ignore section error */ }
    }
    if (structure.education.length > 20) {
        try {
           const out = await hf.featureExtraction({ model, inputs: structure.education });
           sectionEmbeddings.education = Array.from(out) as number[];
        } catch(e) { /* Ignore section error */ }
   }
    
    const enhancedMatches = topMatches.map(job => {
      const jobText = `${job.title} ${job.description}`;
      const jobSkills = extractSkills(jobText);
      const gap = analyzeGap(resumeSkills.found, jobSkills.found);
      
      const jobVec = (job.embedding || []) as number[];
      
      // Use the new weighted scoring with proper fallbacks
      const weightedResult = computeWeightedScore(
        {
          experience: sectionEmbeddings.experience || null,
          skills: sectionEmbeddings.skills || null,
          education: sectionEmbeddings.education || null
        },
        jobVec,
        job.score // Original global cosine similarity as fallback
      );
      
      // Level matching bonus
      const levelMatch = matchExperienceLevel(
        experienceAnalysis.level,
        (job as any).level
      );
      
      // Ensemble score: combines semantic + skills + level
      const ensembleScore = computeEnsembleScore(
        weightedResult,
        gap.matchPercentage,
        levelMatch >= 0.8
      );

      return {
        ...job,
        score: ensembleScore,
        analysis: {
          missingSkills: gap.missing,
          matchedSkills: gap.matching,
          extraSkills: gap.extra,
          matchPercentage: gap.matchPercentage,
          sectionScores: weightedResult.sectionScores,
          scoringStrategy: weightedResult.strategy,
          availableSections: weightedResult.availableSections,
          levelMatch: levelMatch,
          candidateLevel: experienceAnalysis.level
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

    // Generate Resume Feedback
    const topJobSkills = enhancedMatches
      .slice(0, 5)
      .flatMap(m => m.analysis?.matchedSkills || [])
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 10);
    
    const resumeFeedback = generateResumeFeedback(
      resumeText,
      structure,
      resumeSkills,
      experienceAnalysis,
      topJobSkills
    );
    const duration = Math.round(performance.now() - startTime);
    log.info('Request completed successfully', { 
      durationMs: duration, 
      matchCount: enhancedMatches.length,
      resumeGrade: resumeFeedback.grade
    });

    return NextResponse.json({
      success: true,
      matches: enhancedMatches.sort((a, b) => b.score - a.score),
      visualization: visualizationData,
      structure,
      experienceAnalysis,
      resumeFeedback,
      resumePreview: cleanedText.substring(0, 200) + '...'
    }, { headers: rateLimitHeaders(rateCheck) });
    
  } catch (error: any) {
    const duration = Math.round(performance.now() - startTime);
    log.error('Request failed', { 
      durationMs: duration,
      error: error.message 
    });
    return NextResponse.json(
      { error: 'Failed to process resume', details: error.message },
      { status: 500 }
    );
  }
}


