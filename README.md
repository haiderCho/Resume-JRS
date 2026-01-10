# Resume Job Recommender System (JRS)

> **Explainable AI (XAI) for Talent Acquisition.**
> A client-side Semantic Search Engine that matches resumes to jobs using High-Dimensional Vector Embeddings.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)

## 🔍 Overview

This is not a traditional keyword matcher. It is a **Hybrid Search Engine** that combines:

1. **Dense Vector Retrieval**: Uses `all-MiniLM-L6-v2` (384d) to understand semantic context (e.g., matching "Frontend Dev" to "React Engineer").
2. **Symbolic Taxonomy**: Deterministically extracts hard skills for precise gap analysis.
3. **Structure-Aware Scoring**: Parses resumes into sections (Experience vs Skills) to prevent "keyword stuffing" false positives.

## 🚀 Key Features

- **Semantic Market Map**: Visualizes the candidate's position in the job market using custom **Dual PCA** dimensionality reduction (384d → 2d).
- **Explainable Matching (XAI)**:
  - **Skill Gap Analysis**: Explicitly lists "Matched", "Missing", and "Extra" skills.
  - **Section Scoring**: Break down score by *Experience Compatibility* vs *Skill Compatibility*.
- **Smart Chunking**: Implements sliding window strategies to process long resumes without hitting Transformer token limits.
- **Privacy First**: Zero-retention architecture. Resumes are processed in-memory and discarded instantly.

## 🛠️ Technical Documentation

For deep dives into the algorithms and architecture, please see the `docs/` directory:

- [**Technical Architecture**](docs/TECHNICAL_ARCHITECTURE.md): Details on the Embedding Pipeline, PCA Math, and Hybrid Scoring logic.
- [**Setup & Deployment**](docs/SETUP.md): Guide for running locally or deploying to Vercel.

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
```

### Run

```bash
npm run dev
# Open http://localhost:3000
```

## 🧪 Algorithms implemented

- **Vector Similarity**: Cosine Similarity in 384-dimensional space.
- **Dimensionality Reduction**: Principal Component Analysis (Eigenvalue Decomposition of Gram Matrix).
- **NLP Parsing**: Regex-heuristic segmentation for resume structure.

## 📄 License

[MIT](LICENSE)
