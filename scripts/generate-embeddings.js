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

    try {
      // Check for key or mock
      if (!process.env.HUGGINGFACE_API_KEY || process.env.HUGGINGFACE_API_KEY === 'your_key_here') {
         throw new Error('No API Key');
      }

      const embedding = await hf.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: text,
      });

      jobsWithEmbeddings.push({
        ...job,
        embedding: Array.from(embedding),
      });

      console.log(`[${i + 1}/${jobsToProcess.length}] Processed: ${job.title}`);
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
