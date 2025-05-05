# document-intelligence

**Description:**  
A Retrieval-Augmented Generation (RAG) system that uses [Ollama](https://ollama.com) to enable intelligent document understanding. It employs two separate models — one for embedding documents and another for semantic question answering — to provide contextual responses based on the ingested content.

---

## Features

- Document embedding for efficient vector search
- Semantic answering based on document context
- Node.js-based frontend for interaction
- Python backend to orchestrate retrieval and generation

---

## Installation & Setup

### 1. Install Ollama

Follow the installation instructions for your operating system:  
https://ollama.com/download

### 2. Add Required Models

Open a terminal and pull the necessary models:

```bash
ollama pull nomic-embed-text      # For document embedding
ollama pull llama3                # For question answering
```

### 3. Set Up the Frontend

```bash
cd app
npm install
npm run dev
```


### 4. Start the Backend

```bash
pip install -r requirements.txt
python main.py

```