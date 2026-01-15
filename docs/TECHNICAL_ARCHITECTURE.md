# Technical Architecture

## Overview

This is a **semantic search engine** specialized for resume-to-job matching. It leverages a hybrid approach combining **dense vector retrieval** (for semantic understanding) and **symbolic logic** (for precision skill matching). The system runs as a Next.js serverless API with no external Vector Database dependencies.

## System Components

### 1. Vector Pipeline

Located in `app/api/recommend/route.ts` and `lib/similarity.ts`.

#### A. Embedding Generation

Model: `sentence-transformers/all-MiniLM-L6-v2` via HuggingFace Inference API.

- **Input**: Raw text extracted from PDF/DOCX
- **Preprocessing**: `splitIntoChunks` (Sliding Window)
  - Window: 200 words (~256 tokens)
  - Overlap: 50 words
- **Aggregation**: Mean Pooling
  $$ V_{doc} = \frac{1}{N} \sum_{i=1}^{N} V_{chunk_i} $$

#### B. Dimensionality Reduction

Located in `lib/pca.ts`.

Custom **Dual PCA** engine for 2D visualization:

- Eigenvalue decomposition of Gram Matrix ($XX^T$) optimized for $N \ll D$
- Output: 2D coordinates ($PC_1, PC_2$) representing highest variance axes

### 2. Scoring Engine

Located in `lib/weighted-scoring.ts`.

#### A. Weighted Section Scoring

Three fallback strategies:

| Strategy | Trigger | Formula |
|----------|---------|---------|
| **Weighted** | All sections detected | $0.5 \times Exp + 0.3 \times Skills + 0.2 \times Edu$ |
| **Blended** | Partial sections (<30% weight) | $0.7 \times Global + 0.3 \times Weighted$ |
| **Fallback** | No sections | $1.0 \times Global$ |

#### B. Ensemble Ranking

Final score combines multiple signals:

```
EnsembleScore = 0.55 × SemanticScore + 0.30 × SkillMatch% + 0.15 × LevelMatch
```

### 3. Analysis Modules

| Module | Location | Purpose |
|--------|----------|---------|
| Experience Detection | `lib/experience-detection.ts` | Infers seniority (Entry → Principal) |
| Job Quality | `lib/job-quality.ts` | Filters low-quality postings |
| Resume Feedback | `lib/resume-feedback.ts` | Generates improvement suggestions |
| Skills Extraction | `lib/skills-extraction.ts` | Taxonomy-based skill matching |

### 4. Infrastructure

| Module | Location | Purpose |
|--------|----------|---------|
| LRU Cache | `lib/cache.ts` | Caches embeddings (200 entries, 1hr TTL) |
| Rate Limiter | `lib/rate-limiter.ts` | 10 requests/min per IP |
| Logger | `lib/logger.ts` | Structured JSON logging |

## Data Flow

```
1. Upload → PDF/DOCX via FormData
2. Rate Check → 10 req/min limit
3. Extract → pdf-parse / mammoth
4. Parse → Section detection (Experience, Skills, Education)
5. Embed → HF API → 384d vectors (cached)
6. Quality Filter → Remove low-quality jobs
7. Score → Ensemble ranking
8. Analyze → Experience level + skill gaps
9. Feedback → Resume improvement tips
10. Response → Top 10 + visualization + feedback
```

## Skills Taxonomy

Located in `data/skills-taxonomy.json`.

- **500+ skills** across **12 categories**
- Categories: Languages, Frontend, Backend, Database, DevOps & Cloud, AI & Data Science, Mobile, Security, Blockchain & Web3, Tools & Methods, Soft Skills, Certifications
- Includes aliases (e.g., "React" = "ReactJS" = "React.js")

## Stack & Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Next.js 16 (App Router) | Serverless API + React |
| Styling | Tailwind CSS | Rapid development |
| State | React useState + useMemo | Single-flow app |
| Visualization | Recharts | Lightweight, React-native |
| Testing | Vitest | Fast, ESM-first |
| No Vector DB | In-memory scan | ~1000 jobs, <10ms scan |

## Security & Privacy

- **In-Memory Processing**: Resumes discarded after response
- **Rate Limiting**: Prevents API abuse
- **Request Tracing**: Unique request IDs for debugging
- **Environment Isolation**: API keys via `.env.local`
