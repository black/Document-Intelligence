// Configuration
const API_URL = 'http://localhost:5000';
let selectedDocId = null;

// DOM Elements
const documentList = $('#document-list');
const selectedDocumentDisplay = $('#selected-document');
const uploadButton = $('#upload-button');
const fileInput = $('#pdf-upload');
const uploadStatus = $('#upload-status');
const questionInput = $('#question-input');
const askButton = $('#ask-button');
const answerBox = $('#answer-box');

// Load documents on page load
//$('DOMContentLoaded', loadDocuments);

$(document).ready(loadDocuments)

// Event listeners
//uploadButton.addEventListener('click', uploadPDF);
uploadButton.click(uploadPDF) 
askButton.click(askQuestion);

// Functions
function loadDocuments() {
    console.log("page lodaded")
    fetch(`${API_URL}/documents`)
        .then(response => response.json())
        .then(data => {
            if (data.documents && data.documents.length > 0) { 
                data.documents.forEach(doc => {
                    const docElement = document.createElement('div');
                    docElement.className = 'p-4';
                    docElement.innerHTML = `
                        <span>${doc.filename}</span>
                        <button class="delete" data-docid="${doc.doc_id}">Delete</button>
                    `;
                    docElement.addEventListener('click', (e) => {
                        if (!e.target.classList.contains('delete')) {
                            selectDocument(doc.doc_id, doc.filename);
                        }
                    }); 

                    documentList.append( docElement);
                    //documentList.appendChild(docElement);
                }); 
                // Add event listeners to delete buttons
                document.querySelectorAll('.delete').forEach(button => {
                    button.click((e)=>{
                        e.stopPropagation();
                        deleteDocument(button.getAttribute('data-docid'));
                    })
                    // button.addEventListener('click', (e) => {
                    // });
                });
            } else {
                documentList.innerHTML = '<p>No documents uploaded yet.</p>';
            }
        })
        .catch(error => {
            console.error('Error loading documents:', error);
            documentList.innerHTML = '<p class="error">Error loading documents.</p>';
        });
}

function uploadPDF() {
    console.log("uploading PDF");
    const file = fileInput[0].files[0];
    if (!file) {
        showStatus('Please select a PDF file.', 'error');
        return;
    } 
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showStatus('Only PDF files are supported.', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    showStatus('Uploading and processing PDF...', 'info');
    
    fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showStatus('PDF uploaded successfully!', 'success');
            fileInput.value = '';
            loadDocuments();
        } else {
            showStatus(`Error: ${data.error}`, 'error');
        }
    })
    .catch(error => {
        console.error('Error uploading PDF:', error);
        showStatus('Error uploading PDF. Please try again.', 'error');
    });
}

function selectDocument(docId, filename) {
    selectedDocId = docId;
    selectedDocumentDisplay.textContent = `Selected: ${filename}`;
    askButton.disabled = false;
    
    // Update UI to show selected document
    document.querySelectorAll('.document-item').forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('.delete').getAttribute('data-docid') === docId) {
            item.classList.add('active');
        }
    });
    
    // Clear previous answers
    answerBox.innerHTML = '<p>Ask a question about this document.</p>';
}

function askQuestion() {
    const question = questionInput.value.trim();
    
    if (!selectedDocId) {
        showStatus('Please select a document first.', 'error');
        return;
    }
    
    if (!question) {
        showStatus('Please enter a question.', 'error');
        return;
    }
    
    answerBox.innerHTML = '<div class="loading">Generating answer...</div>';
    
    fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            doc_id: selectedDocId,
            question: question
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            answerBox.innerHTML = `<p class="error">Error: ${data.error}</p>`;
            return;
        }
        
        let answerHTML = `<p>${data.answer}</p>`;
        
        // Add sources if available
        if (data.sources && data.sources.length > 0) {
            answerHTML += '<div class="sources"><strong>Sources:</strong><ul>';
            data.sources.forEach(source => {
                answerHTML += `<li>${source.filename} (Page ${source.page})</li>`;
            });
            answerHTML += '</ul></div>';
        }
        
        answerBox.innerHTML = answerHTML;
    })
    .catch(error => {
        console.error('Error asking question:', error);
        answerBox.innerHTML = '<p class="error">Error generating answer. Please try again.</p>';
    });
}

function deleteDocument(docId) {
    if (confirm('Are you sure you want to delete this document?')) {
        fetch(`${API_URL}/delete/${docId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (selectedDocId === docId) {
                    selectedDocId = null;
                    selectedDocumentDisplay.textContent = 'No document selected';
                    askButton.disabled = true;
                    answerBox.innerHTML = '<p>Select a document and ask a question to see the answer here.</p>';
                }
                loadDocuments();
            } else {
                showStatus(`Error: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting document:', error);
            showStatus('Error deleting document. Please try again.', 'error');
        });
    }
}

function showStatus(message, type) {
    uploadStatus.className = 'status-message ' + type;
    uploadStatus.textContent = message;
    
    // Clear status after 5 seconds
    setTimeout(() => {
        uploadStatus.textContent = '';
        uploadStatus.className = 'status-message';
    }, 5000);
}