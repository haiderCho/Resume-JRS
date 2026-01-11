# Technical Architecture

## Overview

This is a **semantic search engine** specialized for resume-to-job matching. It leverages a hybrid approach combining **dense vector retrieval** (for semantic understanding) and **symbolic logic** (for precision skill matching). The system runs entirely client-side and server-side (Next.js API Routes), with no dependencies on external Vector Databases, prioritizing privacy and portability.

## System Components

### 1. Vector Pipeline (Backend)

Located in `app/api/recommend/route.ts` and `lib/similarity.ts`.

#### A. Embedding Generation

We utilize the `sentence-transformers/all-MiniLM-L6-v2` model hosted via HuggingFace Inference API.

- **Input**: Raw text extracted from PDF/DOCX.
- **Preprocessing**: `splitIntoChunks` (Sliding Window Strategy).
  - Window: 200 words (~256 tokens)
  - Overlap: 50 words
- **Aggregation**: Mean Pooling.
  $$ V_{doc} = \frac{1}{N} \sum_{i= N} V_{chunk_i} $$
This solves the 512-token limit of BERT-based models, ensuring long resumes are fully represented.

#### B. Dimensionality Reduction

Located in `lib/pca.ts`.
To enable 2D visualization of the 384-dimensional latent space, we implemented a custom **Dual Principal Component Analysis (PCA)** engine.

- **Math**: Eigenvalue decomposition of the Gram Matrix ($XX^T$) rather than the Covariance Matrix ($X^TX$), optimizing for $N << D$ (where N=50 jobs, D=384 dimensions).
- **Output**: 2D coordinates ($PC_1, PC_2$) representing the highest variance axes.

### 2. Matching Engine

The matching score is not a simple cosine similarity. It is a weighted ensemble:

1. **Weighted Scoring (Algorithm)**
   Instead of a single global cosine similarity, we compute a composite score to prioritize experience:
   $$ Score_{final} = 0.5 \cdot Sim(Experience) + 0.3 \cdot Sim(Skills) + 0.2 \cdot Sim(Education) $$
   *(Fallback to global cosine similarity if sections are too sparse).*

## Data Flow

1. **Upload**: User drops PDF/DOCX -> `app/page.tsx` -> `FormData`.
2. **Extraction**: `pdf-parse` / `mammoth` extracts raw text.
3. **Structure Parsing**: Heuristics identify "Experience" vs "Education" blocks.
4. **Embedding**: Text chunks -> HF API -> 384d Vectors.
5. **Ranking**: In-memory Cosine Similarity against `jobs-with-embeddings.json`.
6. **Response**: Top 10 matches + Visualization Coordinates + Skill Gap breakdown.

## Stack & Decisions

- **Framework**: Next.js 14 (App Router) for serverless API capabilities.
- **Styling**: Tailwind CSS for rapid, maintainable UI development.
- **State**: React `useState` (Local state sufficient for single-flow app).
- **Visualization**: `Recharts` for scatter plots (lightweight, React-native).
- **No Vector DB**: Dataset is small (~1000 jobs). Linear scan in memory (<10ms) is faster than network roundtrip to Pinecone/Weaviate.

## Security & Privacy

- **In-Memory Processing**: Resumes are processed in RAM and discarded immediately. No file storage (S3/Blob).
- **Environment Variables**: API Keys managed via `.env.local` and never exposed to client bundles.
