# Resume Job Recommender System (JRS)

> **Semantic Resume Matching powered by AI Embeddings.**

This application allows users to upload a resume (PDF/DOCX) and instantly finds the most relevant job opportunities from a curated dataset. It uses **Hugging Face's transformer models** to generate embeddings for both the resume and job descriptions, performing a **vector similarity search** (Cosine Similarity) to rank the best matches.

## 🚀 Key Features

* **Intelligent Matching**: Uses `sentence-transformers/all-MiniLM-L6-v2` to understand the *meaning* of skills and experience, not just keyword matching.
* **Privacy First**: Resumes are processed in-memory and **never stored** on the server.
* **Instant Results**: Returns matched jobs within seconds with a compatibility score (0-100%).
* **Dynamic Application**: "Apply Now" buttons perform a live search on Indeed for the specific role, ensuring valid links.
* **Format Support**: Handles both `.pdf` and `.docx` file parsing.

## 🛠️ Architecture

* **Frontend**: Next.js 16 (App Router), Tailwind CSS, Lucide Icons.
* **Backend**: Next.js API Routes.
* **AI/ML**: Hugging Face Inference API.
* **Data Processing**: `pdf-parse` (v1.1.1), `mammoth`, `cosine-similarity`.
* **Database**: Static JSON dataset (pre-embedded) for high-speed retrieval.

## 📦 Getting Started

### Prerequisites

* Node.js 18+
* A **Hugging Face API Key** (Free tier is sufficient).

### Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/resume-jrs.git
    cd resume-jrs
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

    > **Note:** We strictly use `pdf-parse@1.1.1` to avoid export issues on some environments.

3. **Configure Environment:**
    Create a `.env.local` file in the root directory:

    ```bash
    HUGGINGFACE_API_KEY=hf_your_huggingface_key_here
    ```

4. **Run Development Server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to use the app.

## 🧠 How It Works

1. **Preprocessing (Offline)**:
    * We run `scripts/generate-embeddings.js` to pre-calculate embeddings for our job dataset (`data/jobs_dataset.json`).
    * These vectors are stored in `data/jobs-with-embeddings.json`.

2. **Inference (Runtime)**:
    * User uploads a resume.
    * Server extracts text using `pdf-parse` or `mammoth`.
    * Text is cleaned and sent to Hugging Face Inference API.
    * API returns a 384-dimensional vector representing the resume.

3. **Matching**:
    * We calculate the **Cosine Similarity** between the resume vector and every job vector in our dataset.
    * Jobs are sorted by score, and the top 10 are returned.

## 🔮 Future Roadmap

* [ ] **Live Data Fetching**: Integrate Adzuna or JSearch API to fetch fresh jobs weekly instead of using a static dataset.
* [ ] **Filter by Location**: Add UI controls to filter matches by city/country.
* [ ] **Detailed Breakdown**: Show *why* a job matched (e.g., "Matched on: Python, React").

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)
