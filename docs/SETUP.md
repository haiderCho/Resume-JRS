# Setup & Deployment Guide

## 1. Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- HuggingFace API Key (Free tier works)

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/haiderCho/resume-jrs.git
    cd resume-jrs
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Environment Setup**

    Create a `.env.local` file in the root:

    ```env
    HUGGINGFACE_API_KEY=hf_your_key_here
    LOG_LEVEL=info  # debug | info | warn | error (optional)
    ```

4. **Run Development Server**

    ```bash
    npm run dev
    ```

    Open `http://localhost:3000` to view the app.

## 2. Project Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (watch mode) |
| `npm run test:run` | Run tests (single run) |

### Data Scripts

```bash
# Re-generate job embeddings (if modifying jobs_dataset.json)
npx tsx scripts/generate-embeddings.ts

# Generate skill embeddings for semantic matching
npx tsx scripts/generate-skill-embeddings.ts
```

## 3. Testing

The project uses **Vitest** for unit testing.

```bash
# Watch mode (re-runs on file changes)
npm test

# Single run (CI/CD)
npm run test:run
```

### Test Coverage

| Test File | Coverage |
|-----------|----------|
| `tests/cache.test.ts` | LRU cache operations |
| `tests/rate-limiter.test.ts` | Rate limit logic |
| `tests/weighted-scoring.test.ts` | Scoring strategies |
| `tests/experience-detection.test.ts` | Level detection |

## 4. Project Structure

```
├── app/
│   ├── api/recommend/route.ts  # Main API endpoint
│   ├── page.tsx                # Frontend UI
│   └── globals.css
├── lib/
│   ├── weighted-scoring.ts     # Ensemble ranking
│   ├── experience-detection.ts # Seniority inference
│   ├── job-quality.ts          # Job filtering
│   ├── resume-feedback.ts      # Improvement tips
│   ├── cache.ts                # LRU embedding cache
│   ├── rate-limiter.ts         # API rate limiting
│   ├── logger.ts               # Structured logging
│   ├── similarity.ts           # Cosine similarity
│   ├── pca.ts                  # Dimensionality reduction
│   ├── skills-extraction.ts    # Skill parsing
│   └── text-extraction.ts      # PDF/DOCX parsing
├── data/
│   ├── jobs-with-embeddings.json
│   └── skills-taxonomy.json    # 500+ skills
├── tests/                      # Vitest unit tests
├── scripts/                    # Data generation scripts
└── docs/                       # Documentation
```

## 5. Deployment (Vercel)

This application is optimized for [Vercel](https://vercel.com).

1. **Push to GitHub**: Ensure main branch is up to date
2. **Import Project**:
    - Vercel Dashboard → "Add New..." → "Project"
    - Select your repository
3. **Environment Variables**:
    - Add `HUGGINGFACE_API_KEY` in Project Settings
    - Optional: `LOG_LEVEL=info`
4. **Deploy**: Click "Deploy"

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "DOMMatrix is not defined" | Ensure `next/dynamic` for visualization components |
| 500 Errors | Check Vercel Logs, verify API key |
| Rate limit errors | API limits 10 req/min per IP |
| Slow embedding | Check HuggingFace API status |

## 6. API Reference

### POST /api/recommend

Upload a resume and get job matches.

**Request:**

```
Content-Type: multipart/form-data
Body: resume (File) - PDF or DOCX
```

**Response:**

```json
{
  "success": true,
  "matches": [...],           // Top 10 job matches
  "visualization": {...},     // PCA coordinates
  "experienceAnalysis": {...}, // Detected level
  "resumeFeedback": {...},    // Grade + suggestions
  "resumePreview": "..."
}
```

**Headers:**

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 60
```
