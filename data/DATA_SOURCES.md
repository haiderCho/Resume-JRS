# Data Sources & Curation Strategy

## 1. Skills Taxonomy (`data/skills-taxonomy.json`)

a **Curated High-Quality Dataset** for Skills Gap Analysis.

### **Source**

This taxonomy was constructed by aggregating top keywords from:

- **GitHub Open Source Lists**: Synthesized from repositories like `zauberware/skill-set-json` and `nokia/skilltree`.
- **Industry Trends**: Validated against 2024/2025 tech stack surveys (Stack Overflow Developer Survey, State of JS).
- **Manual Curation**: Categorized into `Frontend`, `Backend`, `AI/ML`, etc. to enable semantic grouping in the analysis engine.

### **Quality Control**

- **Normalization**: Aliases (e.g., "React" and "React.js") are mapped or grouped.
- **Categorization**: Skills are assigned rigid categories to prevent "bucket errors" in visualization.

---

## 2. Jobs Dataset (`data/jobs_dataset.json`)

A dataset of **Real-World Job Descriptions** used for embedding generation and benchmarking.

### **Source**

- **Platform**: Aggregated from major job boards (Indeed, LinkedIn, Glassdoor) via public datasets or scraping simulations.
- **Content**: Contains `title`, `company`, `description` (full text), and `location`.

### **Enhancements (In Progress)**

- **Text Cleaning**: We apply `lib/text-extraction.ts` logic to remove HTML tags and excessive whitespace.
- **Augmentation**: Planned augmentation with "Seniority Level" and "Salary Range" parsing.

---

## 3. External Models (Hugging Face)

- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Source**: [Hugging Face Hub](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- **License**: Apache 2.0
- **Usage**: Used for generating 384-dimensional dense vector embeddings for semantic search.
