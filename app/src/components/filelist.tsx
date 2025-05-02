"use client";

import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DocType } from "@/types";

interface Props {
  API_URL: string;
  onSelectChange: (value: DocType) => void;
}

const FileList = (props: Props) => {
  const { API_URL, onSelectChange } = props;
  const [files, setFiles] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/documents`) // Example API
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        setFiles(data.documents);
        setLoading(false);
      })
      .catch((error) => {
        setError(error);
        setLoading(false);
      });
  }, []); // Empty dependency array means this runs once when component mount

  if (loading) return <p>Loading...</p>;
  if (error) toast("There was an Error : ${error}");

  const handleSelect  = (docId: string) => {
    const selectedFile = files.find((file) => file.doc_id === docId);
    if (selectedFile) {
      onSelectChange(selectedFile);
    } else {
      console.warn("Selected doc_id not found in files.");
    }
  };

  return (
    <>
      <Select onValueChange={handleSelect}>
        <SelectTrigger className="w-full max-w-60">
          <SelectValue placeholder="Select File" />
        </SelectTrigger>
        <SelectContent>
          {files.map((file, i) => (
            <SelectItem value={file.doc_id} key={i}>
              {file.filename}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Toaster />
    </>
  );
};

export default FileList;
