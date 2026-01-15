/**
 * Generates embeddings for all skills in the taxonomy.
 * Run once: npx tsx scripts/generate-skill-embeddings.ts
 */
import { HfInference } from '@huggingface/inference';
import * as fs from 'fs';
import * as path from 'path';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

interface SkillEmbedding {
  skill: string;
  category: string;
  embedding: number[];
}

async function generateEmbedding(text: string): Promise<number[]> {
  const output = await hf.featureExtraction({ model: MODEL, inputs: text });
  return Array.from(output) as number[];
}

async function main() {
  const taxonomyPath = path.join(__dirname, '../data/skills-taxonomy.json');
  const outputPath = path.join(__dirname, '../data/skill-embeddings.json');
  
  const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf-8'));
  const results: SkillEmbedding[] = [];
  
  console.log('🚀 Generating skill embeddings...\n');
  
  for (const [category, skills] of Object.entries(taxonomy.categories)) {
    console.log(`📂 Processing category: ${category}`);
    
    for (const skill of skills as string[]) {
      try {
        // Add context to improve embedding quality
        const contextualizedSkill = `${skill} programming technology`;
        const embedding = await generateEmbedding(contextualizedSkill);
        
        results.push({ skill, category, embedding });
        process.stdout.write('.');
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 100));
      } catch (error) {
        console.error(`\n❌ Failed for skill: ${skill}`, error);
      }
    }
    console.log(' ✅');
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Generated ${results.length} skill embeddings`);
  console.log(`📁 Saved to: ${outputPath}`);
}

main().catch(console.error);
