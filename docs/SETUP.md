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
    ```

4. **Run Development Server**

    ```bash
    npm run dev
    ```

    Open `http://localhost:3000` to view the app.

## 2. Project Scripts

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Compiles the application for production.
- `npm run start`: Runs the built application locally.
- `node scripts/generate-embeddings.js`: Re-generates the job embeddings dataset (requires API key).
- `node scripts/validate-data.js`: Validates integrity of `jobs-with-embeddings.json`.

## 3. Data Pipeline

The job dataset is pre-computed to avoid runtime API costs. If you modify `data/jobs_dataset.json`, you must re-run the embedding script:

```bash
node scripts/generate-embeddings.js
```

*Note: This process uses the same "Smart Chunking" logic as the live API to ensure vector space alignment.*

## 4. Deployment (Vercel)

This application is optimized for [Vercel](https://vercel.com).

1. **Push to GitHub**: Ensure main branch is up to date.
2. **Import Project**:
    - Go to Vercel Dashboard -> "Add New..." -> "Project".
    - Select your repository.
3. **Environment Variables**:
    - Add `HUGGINGFACE_API_KEY` in the Vercel Project Settings.
4. **Deploy**:
    - Click "Deploy". The build process handles the TypeScript compilation and optimization automatically.

### Troubleshooting Deployment

- **"DOMMatrix is not defined"**: This usually means a server-side library is leaking into the client bundle. Ensure you are using `next/dynamic` for visualization components (we handle this in `app/page.tsx`).
- **500 Errors**: Check Vercel Logs. usually indicates a missing API Key or `pdf-parse` incompatibility (we use version 1.1.1).
