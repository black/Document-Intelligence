from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import uuid
import time

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_ollama import OllamaEmbeddings
from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
UPLOAD_FOLDER = 'pdfs/'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Initialize embeddings and LLM model
embeddings = OllamaEmbeddings(model="deepseek-r1:1.5b")
model = OllamaLLM(model="deepseek-r1:1.5b")

# Store vector databases in memory
vector_stores = {}

# Chat prompt template
template = """
You are an assistant that answers questions. Using the following retrieved information, answer the user question. If you don't know the answer, say that you don't know. Use up to three sentences, keeping the answer concise.
Question: {question} 
Context: {context} 
Answer:
"""
prompt_template = ChatPromptTemplate.from_template(template)

@app.route('/upload', methods=['POST'])
def upload_pdf():
    """
    Endpoint to upload a PDF and create a vector store
    """

    print("received...")

    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'Only PDF files are supported'}), 400
    
    try:
        # Generate unique ID for this document
        doc_id = str(uuid.uuid4())
        
        # Save file to disk temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{doc_id}_{filename}")
        file.save(file_path)
        
        # Create vector store
        vector_stores[doc_id] = create_vector_store(file_path)
        
        return jsonify({
            'success': True,
            'doc_id': doc_id,
            'filename': filename
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/query', methods=['POST'])
def query_document():
    """
    Endpoint to query a previously uploaded document
    """
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    doc_id = data.get('doc_id')
    question = data.get('question')
    
    if not doc_id or not question:
        return jsonify({'error': 'Missing doc_id or question'}), 400
    
    if doc_id not in vector_stores:
        return jsonify({'error': 'Document not found'}), 404
    
    try:
        # Retrieve relevant documents
        docs = retrieve_docs(vector_stores[doc_id], question)
        
        # Generate answer
        answer = question_pdf(question, docs)
        
        # Format sources
        sources = []
        for doc in docs:
            if hasattr(doc, 'metadata') and 'source' in doc.metadata:
                source_info = {
                    'filename': os.path.basename(doc.metadata['source']),
                    'page': doc.metadata.get('page', 'unknown')
                }
                if source_info not in sources:
                    sources.append(source_info)
        
        return jsonify({
            'answer': answer,
            'sources': sources
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/documents', methods=['GET'])
def list_documents():
    """
    Endpoint to list all uploaded documents
    """
    documents = []
    for doc_id in vector_stores:
        # Try to find the original filename from the saved path
        file_pattern = f"{doc_id}_"
        matching_files = [f for f in os.listdir(app.config['UPLOAD_FOLDER']) if f.startswith(file_pattern)]
        
        filename = matching_files[0].replace(file_pattern, '') if matching_files else "Unknown"
        
        documents.append({
            'doc_id': doc_id,
            'filename': filename
        })
    
    return jsonify({'documents': documents})

@app.route('/delete/<doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    """
    Endpoint to delete a document
    """
    if doc_id not in vector_stores:
        return jsonify({'error': 'Document not found'}), 404
    
    try:
        # Remove from vector store
        del vector_stores[doc_id]
        
        # Delete physical file
        file_pattern = f"{doc_id}_"
        matching_files = [f for f in os.listdir(app.config['UPLOAD_FOLDER']) if f.startswith(file_pattern)]
        
        for file in matching_files:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], file))
        
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def create_vector_store(file_path):
    """
    Create a vector store from a PDF file
    """
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2000,
        chunk_overlap=300,
        add_start_index=True
    )

    chunked_docs = text_splitter.split_documents(documents)
    db = FAISS.from_documents(chunked_docs, embeddings)
    return db

def retrieve_docs(db, query, k=4):
    """
    Retrieve relevant documents for a query
    """
    return db.similarity_search(query, k)

def question_pdf(question, documents):
    """
    Generate an answer to a question based on the retrieved documents
    """
    context = "\n\n".join([doc.page_content for doc in documents])
    chain = prompt_template | model

    response = chain.invoke({"question": question, "context": context})
    return response.content if hasattr(response, 'content') else str(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)