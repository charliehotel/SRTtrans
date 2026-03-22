"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileType, Trash2 } from "lucide-react";

interface FileUploaderProps {
  files: File[];
  isTranslating: boolean;
  onFilesChange: (files: File[]) => void;
  onError: (msg: string | null) => void;
}

export default function FileUploader({ files, isTranslating, onFilesChange, onError }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addValidFiles = (selectedFiles: File[]) => {
    const srtFiles = selectedFiles.filter((f) => f.name.toLowerCase().endsWith(".srt"));
    if (srtFiles.length > 0) {
      const existingNames = files.map((p) => p.name);
      const newUniqueFiles = srtFiles.filter((f) => !existingNames.includes(f.name));
      onFilesChange([...files, ...newUniqueFiles]);
      onError(null);
    } else {
      onError("Please select valid .srt files.");
    }
  };

  return (
    <>
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-indigo-500 bg-indigo-900/20"
            : "border-slate-600 hover:border-indigo-500 hover:bg-slate-800/50"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) addValidFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <input
          type="file"
          accept=".srt"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => { if (e.target.files) addValidFiles(Array.from(e.target.files)); }}
        />
        <div className="flex flex-col items-center">
          <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
          <span className="text-slate-300 font-medium">Click or Drag & Drop multiple .srt files here</span>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-slate-400 text-sm mb-3">Selected Files ({files.length})</h3>
          <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {files.map((f) => (
              <li key={f.name} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileType className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span className="text-slate-300 truncate text-sm">{f.name}</span>
                </div>
                {!isTranslating && (
                  <button
                    onClick={() => onFilesChange(files.filter((x) => x.name !== f.name))}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
