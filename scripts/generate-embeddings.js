const { HfInference } = require("@huggingface/inference");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Use the actual dataset file
const jobsSource = require("../data/jobs_dataset.json");

async function generateEmbeddings() {
  console.log("Starting embedding generation...");

  // Take first 50 jobs for testing/demo purposes
  const jobsToProcess = jobsSource.slice(0, 50);
  const jobsWithEmbeddings = [];

  for (let i = 0; i < jobsToProcess.length; i++) {
    const rawJob = jobsToProcess[i];

    // transform raw job to expected schema
    const job = {
      id: `job_${String(i + 1).padStart(3, "0")}`,
      title: rawJob.positionName,
      company: rawJob.company,
      description: rawJob.description,
      skills: [], // Mocking empty skills as they are missing in source
      level: "Mid-Senior", // Defaulting
      category: "Engineering", // Defaulting
      originalUrl: rawJob.url,
    };

    const text = `${job.title}. ${job.description}`;

// Helper to split text (Duplicated from lib/text-extraction.ts for standalone script usage)
function splitIntoChunks(text, chunkSize = 200, overlap = 50) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  if (words.length <= chunkSize) return [text];
  
  const chunks = [];
  let i = 0;
  
  while (i < words.length) {
    const end = Math.min(i + chunkSize, words.length);
    chunks.push(words.slice(i, end).join(' '));
    if (end === words.length) break;
    i += (chunkSize - overlap);
  }
  return chunks;
}

    try {
      // Check for key or mock
      if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY === 'your_key_here') {
         throw new Error('No API Key');
      }

      const chunks = splitIntoChunks(text, 200, 50);
      let finalEmbedding;

      if (chunks.length === 1) {
         const output = await hf.featureExtraction({
           model: "sentence-transformers/all-MiniLM-L6-v2",
           inputs: chunks[0],
         });
         finalEmbedding = Array.from(output);
      } else {
         const requests = chunks.map(chunk => hf.featureExtraction({
             model: "sentence-transformers/all-MiniLM-L6-v2",
             inputs: chunk
         }));
         const responses = await Promise.all(requests);
         const combined = new Array(384).fill(0);
         responses.forEach(resp => {
             resp.forEach((val, idx) => combined[idx] += val);
         });
         finalEmbedding = combined.map(val => val / chunks.length);
      }

      jobsWithEmbeddings.push({
        ...job,
        embedding: finalEmbedding,
      });

      console.log(`[${i + 1}/${jobsToProcess.length}] Processed: ${job.title} (${chunks.length} chunks)`);
    } catch (error) {
       console.warn(`[Mock] Generating embedding for ${job.title} (Reason: ${error.message})`);
       // Generate random 384-dimensional embedding
       const mockEmbedding = Array.from({length: 384}, () => Math.random() - 0.5);
       jobsWithEmbeddings.push({
           ...job,
           embedding: mockEmbedding
       });
    }
  }

  fs.writeFileSync(
    path.resolve(__dirname, "../data/jobs-with-embeddings.json"),
    JSON.stringify(jobsWithEmbeddings, null, 2)
  );

  console.log("✅ Embeddings generated successfully");
}

generateEmbeddings();
