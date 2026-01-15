# Resume Job Recommender System (JRS)

> **Explainable AI (XAI) for Talent Acquisition.**
> A client-side Semantic Search Engine that matches resumes to jobs using High-Dimensional Vector Embeddings.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

## 🔍 Overview

This is not a traditional keyword matcher. It is a **Hybrid Search Engine** that combines:

1. **Dense Vector Retrieval**: Uses `all-MiniLM-L6-v2` (384d) to understand semantic context (e.g., matching "Frontend Dev" to "React Engineer").
2. **Symbolic Taxonomy**: 500+ skills across 12 categories for precise gap analysis.
3. **Ensemble Scoring**: Multi-signal ranking combining semantic similarity, skill match %, and experience level alignment.

## 🚀 Key Features

### Core Matching

- **Semantic Market Map**: Visualizes candidate position using custom **Dual PCA** (384d → 2d)
- **Ensemble Ranking**: `Score = 0.55×Semantic + 0.30×SkillMatch + 0.15×LevelMatch`
- **Smart Chunking**: Sliding window (200 words, 50 overlap) to handle long resumes

### Resume Analysis

- **Resume Feedback**: Grade (A-F), score, and actionable improvement suggestions
- **Experience Detection**: Automatic seniority inference (Entry → Principal)
- **Skill Gap Analysis**: "Matched", "Missing", and "Extra" skills breakdown

### UI Features

- **Filter & Sort**: By match score, skill %, experience level
- **Expandable Descriptions**: Click to read full job details
- **Job Quality Filtering**: Removes low-quality job postings automatically

### Production Ready

- **Rate Limiting**: 10 requests/minute per IP
- **LRU Caching**: Reduces redundant embedding API calls
- **Structured Logging**: JSON logs with request IDs and timing
- **Test Suite**: Vitest with 20+ unit tests

## 🛠️ Technical Documentation

For deep dives into algorithms and architecture, see the `docs/` directory:

- [**Technical Architecture**](docs/TECHNICAL_ARCHITECTURE.md): Embedding pipeline, scoring algorithms, system design
- [**Setup & Deployment**](docs/SETUP.md): Local development, testing, and Vercel deployment

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- HuggingFace API Key (Free Tier)

### Installation

```bash
git clone https://github.com/haiderCho/resume-jrs.git
cd resume-jrs
npm install
```

### Environment Config

Create `.env.local`:

```env
HUGGINGFACE_API_KEY=hf_your_key_here
LOG_LEVEL=info  # debug | info | warn | error
```

### Run

```bash
npm run dev     # Development server
npm run build   # Production build
npm test        # Run tests (watch mode)
npm run test:run # Run tests (single run)
```

## 🧪 Algorithms & Modules

| Module | Purpose |
|--------|---------|
| `lib/weighted-scoring.ts` | Dynamic fallback scoring strategies |
| `lib/experience-detection.ts` | Seniority inference from resume text |
| `lib/job-quality.ts` | Job posting quality filtering |
| `lib/resume-feedback.ts` | Improvement suggestions generator |
| `lib/cache.ts` | LRU embedding cache |
| `lib/rate-limiter.ts` | Sliding window rate limiter |
| `lib/logger.ts` | Structured JSON logging |

## 📊 Skills Taxonomy

500+ skills across 12 categories:

- Languages, Frontend, Backend, Database
- DevOps & Cloud, AI & Data Science, Mobile
- Security, Blockchain & Web3, Tools & Methods
- Soft Skills, Certifications

## 📄 License

[MIT](LICENSE)
