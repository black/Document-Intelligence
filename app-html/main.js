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
const loadingProgress = $('#loading-Progress')
const uploadProgress = $('#upload-progress');
const respProgress  = $('#response-progress');
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
                    var option = $("<option>").val(doc.doc_id).text(doc.filename);
                    $('#document-list-dropdown').append(option) 
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
                loadingProgress.removeClass('hidden')
            }
        })
        .catch(error => {
            console.error('Error loading documents:', error);
            documentList.innerHTML = '<p class="error">Error loading documents.</p>';
        });
}


$("#document-list-dropdown").on("change", function() {
    selectedDocId = $(this).val(); 
    selectDocument(selectedDocId)
});

function uploadPDF() {
    console.log("uploading PDF");
    const file = fileInput[0].files[0];
    if (!file) {
        console.log('Please select a PDF file.', 'error');
        return;
    } 
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        console.log('Only PDF files are supported.', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
     
    uploadProgress.removeClass('hidden');
    fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) { 
            fileInput.value = '';
            loadDocuments();
        } else {
            showStatus(`Error: ${data.error}`, 'error');
        }
    })
    .catch(error => {
        console.error('Error uploading PDF:', error); 
        uploadProgress.addClass('hidden');
    });
}

function selectDocument(selectedDocId) { 
    askButton.disabled = false;   
    console.log("Document Selected :: " , selectedDocId)
}

function askQuestion() {
    const question = questionInput.val().trim();
    console.log(question) 
    if (!selectedDocId) {
        console.log('Please select a document first.', 'error');
        return;
    }
    
    if (!question) {
        console.log('Please enter a question.', 'error');
        return;
    }
    
    answerBox.innerHTML = '<div class="loading">Generating answer...</div>';
    respProgress.removeClass('hidden');
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

        console.log(data)

        if (data.error) {
            answerBox.append(`<p class="error">Error: ${data.error}</p>`);
            return;
        }
        
      //  let answerHTML = `<p>${data.answer}</p>`;
        var bubble = $("<li class='text-sm p-4 rounded-sm p-4'>").text(data.answer); 
        var source = $("<div>")
        // Add sources if available
        if (data.sources && data.sources.length > 0) {
            // answerHTML += '<div class="sources"><strong>Sources:</strong><ul>';
            data.sources.forEach(source => {
                source += `<li>${source.filename} (Page ${source.page})</li>`;
            }); 
            answerBox.append(bubble);
            answerBox.append(source); 
        } 
        respProgress.addClass('hidden');
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
                console.log(`Error: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error deleting document:', error);
            console.log('Error deleting document. Please try again.', 'error');
        });
    }
} 