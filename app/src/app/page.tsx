"use client"
import React, { useState} from 'react';
import { ArrowUp, Mic, Paperclip,LoaderCircle } from "lucide-react"
import ReactMarkdown from 'react-markdown';
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Toaster } from "@/components/ui/sonner" 
import FileList from "@/components/filelist" 
import { toast } from "sonner"
import {DocType,Source} from "@/types"
export default function Home() {

  const API_URL = 'http://localhost:5000';  
  const [document, setDocument] = useState<DocType>(); 
  const [question, setQuestion] = useState(''); 
  const [response, setResponse] = useState(''); 
  const [sources, setSources] = useState<Source[]>([]); 
  const [uploading, setUploading] = useState(false);
  const [thinking,setThinking] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // upload document
  const uploadDoc = async (event:React.ChangeEvent<HTMLInputElement>)=>{
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true); 
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      toast('File uploaded successfully!');
      console.log('Server response:', result);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error(error);
      toast('Upload failed');
    } finally {
      setUploading(false);
    }
  }
  
  // get question
  const getQuestion = (event:React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(event.target.value);
  }

  const postQuestion = async () =>{
    if(document==undefined)
      return
    setQuestion('');
    setThinking(true)
    fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            doc_id: document.doc_id,
            question: question
        })
    })
    .then(response => response.json())
    .then(data => {  
        if (data.error) { 
            toast(`Error ${data.error}`);
            return;
        } 
        if (data.sources && data.sources.length > 0) {
            setResponse(data.answer)
            setSources(data.sources) 
            console.log(data)
        }
        setThinking(false)  
    })
    .catch(error => {
      console.error('Error asking question:', error);
      toast("Error generating answer. Please try again."); 
      setThinking(false) 
    });
  } 

  // get selected document
  const handleSelect = (value:DocType) => {
    console.log(value.doc_id, value.filename)
    setDocument(value); 
  };

  return (
    <div className="flex flex-col gap-4 w-full h-screen">  
        <div className="flex overflow-hidden">
        <ScrollArea className="h-full rounded-md border p-4 text-sm space-y-2">
            <ReactMarkdown>{response}</ReactMarkdown> 
            <hr />
            <ol>
              {
                sources.map((item,i)=>(
                  <li key={i}>{item.page} : {item.filename.split('_')[1]}</li>
                ))
              }
            </ol>
          </ScrollArea> 
        </div>
        <div className='flex-1 flex flex-col gap-4 w-full'>
              <Textarea className="border-0 focus-visible:ring-transparent bg-gray-100 rounded" onChange={getQuestion} value={question}/> 
              <div className="flex justify-between">
                <div className="flex gap-2"> 
                    <div className='w-full max-w-60'>
                      <Input type="file" onChange={uploadDoc}/> 
                      <span className='text-xs text-gray-400'>Max file size 16MB</span>
                      <Progress className={uploading ? 'block' : 'hidden'}/>
                    </div>
                    <FileList API_URL={API_URL} onSelectChange={handleSelect}  key={refreshKey}/>
                </div> 
                <div className="space-x-2 place-items-center"> 
                  <Button variant="outline" size="icon"><Mic /></Button>
                  <Button variant="outline" size="icon"><Paperclip /></Button>
                  <Button variant="outline" size="icon" onClick={postQuestion}>
                    {
                      thinking ? <LoaderCircle className="animate-spin"/> : <ArrowUp /> 
                    } 
                  </Button>
                </div>
            </div>
        </div> 
        <Toaster/>
    </div>
  );
}
