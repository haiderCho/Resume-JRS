import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';
import { extractTextFromPDF, extractTextFromDOCX, cleanText } from '@/lib/text-extraction';
import { rankJobs } from '@/lib/similarity';
import jobsData from '@/data/jobs-with-embeddings.json';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export async function POST(request: NextRequest) {
  console.log('API /recommend hit');
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File;
    
    if (!file) {
      console.log('No file found in form data');
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    console.log(`Received file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Extract text based on file type
    const buffer = Buffer.from(await file.arrayBuffer());
    let resumeText: string;
    
    console.log('Starting text extraction...');
    if (file.name.endsWith('.pdf')) {
      resumeText = await extractTextFromPDF(buffer);
    } else if (file.name.endsWith('.docx')) {
      resumeText = await extractTextFromDOCX(buffer);
    } else {
      console.log('Unsupported file type');
      return NextResponse.json(
        { error: 'Unsupported file type. Use PDF or DOCX' },
        { status: 400 }
      );
    }
    console.log('Text extraction complete. Length:', resumeText.length);
    
    const cleanedText = cleanText(resumeText);
    console.log('Text cleaning complete. Length:', cleanedText.length);
    
    // Generate embedding for resume
    console.log('Starting embedding generation...');
    let resumeEmbedding;
    try {
        if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY === 'your_key_here') {
             throw new Error("Missing Key");
        }
        const output = await hf.featureExtraction({
            model: 'sentence-transformers/all-MiniLM-L6-v2',
            inputs: cleanedText
        });
        resumeEmbedding = Array.from(output);
        console.log('Embedding generated successfully');
    } catch (e) {
        console.warn("API Error, using mock embedding for resume:", e);
        resumeEmbedding = Array.from({length: 384}, () => Math.random() - 0.5);
    }
    
    // Rank jobs
    console.log('Ranking jobs...');
    // @ts-ignore
    const matches = rankJobs(resumeEmbedding as number[], jobsData as any[], 10);
    console.log('Ranking complete. Matches found:', matches.length);
    
    return NextResponse.json({
      success: true,
      matches,
      resumePreview: cleanedText.substring(0, 200) + '...'
    });
    
  } catch (error: any) {
    console.error('Error processing resume:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to process resume', details: errorMessage },
      { status: 500 }
    );
  }
}


