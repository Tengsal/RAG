'use client';

import React, { useState, useRef } from 'react';
import { AdminDocument, DocumentCategory } from './mock-data';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: DocumentCategory[];
  onAddDocument: (doc: AdminDocument) => void;
}

export function UploadModal({ isOpen, onClose, categories, onAddDocument }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('academic');
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentStepText, setCurrentStepText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!documentTitle) {
      // Auto fill title without extension
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setDocumentTitle(nameWithoutExt.replace(/_/g, ' '));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const simulateIngestionPipeline = () => {
    if (!selectedFile && !documentTitle) return;

    setIsUploading(true);
    setUploadProgress(10);
    setCurrentStepText('Uploading document binary to encrypted storage...');

    setTimeout(() => {
      setUploadProgress(35);
      setCurrentStepText('Extracting PDF text layout & parsing headings...');
    }, 1000);

    setTimeout(() => {
      setUploadProgress(65);
      setCurrentStepText('Generating dense vector embeddings (bge-large-en)...');
    }, 2200);

    setTimeout(() => {
      setUploadProgress(90);
      setCurrentStepText('Building HNSW vector index in Milvus DB...');
    }, 3400);

    setTimeout(() => {
      setUploadProgress(100);
      setCurrentStepText('Ingestion Complete! Document is live for RAG query grounding.');

      const fileExt = selectedFile?.name.split('.').pop()?.toLowerCase() || 'pdf';
      const categoryObj = categories.find((c) => c.id === selectedCategory) || categories[1];

      const newDoc: AdminDocument = {
        id: `doc-${Date.now().toString().slice(-4)}`,
        title: documentTitle || selectedFile?.name || 'Untitled University Document',
        fileName: selectedFile?.name || `${documentTitle.replace(/\s+/g, '_')}.${fileExt}`,
        fileType: fileExt === 'docx' ? 'docx' : fileExt === 'txt' ? 'txt' : 'pdf',
        category: categoryObj.name,
        categoryId: categoryObj.id,
        uploadDate: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
        fileSize: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '3.4 MB',
        pageCount: Math.floor(Math.random() * 40) + 10,
        status: 'ready',
        vectorChunks: Math.floor(Math.random() * 80) + 30,
        citationScore: +(95 + Math.random() * 4).toFixed(1),
        excerpt: 'Ingested document chunk successfully registered into Knowledge Base vector store with high-confidence semantic grounding.',
        ingestionLogs: [
          { timestamp: 'Just now', step: 'File Upload', status: 'completed', details: 'Validated' },
          { timestamp: 'Just now', step: 'OCR & Parsing', status: 'completed', details: 'Parsed text' },
          { timestamp: 'Just now', step: 'Embedding & Indexing', status: 'completed', details: 'HNSW Index built' },
        ],
      };

      onAddDocument(newDoc);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setSelectedFile(null);
        setDocumentTitle('');
        onClose();
      }, 1000);
    }, 4500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-xl p-8 rounded-3xl border border-white/40 bg-[#f9f9f9]/90 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4441cc]/10 text-[#4441cc] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">cloud_upload</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1a1c1c]">Upload Document to Knowledge Base</h3>
              <p className="text-xs text-[#464554]">
                PDF, DOCX or TXT files for uncertainty-aware RAG vector indexing
              </p>
            </div>
          </div>
          {!isUploading && (
            <button
              onClick={onClose}
              className="text-[#464554] hover:text-[#1a1c1c] p-1 rounded-lg hover:bg-black/5"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        {!isUploading ? (
          <div className="space-y-5">
            {/* Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all duration-200 ${
                isDragOver
                  ? 'border-[#4441cc] bg-[#4441cc]/10 scale-[1.01]'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-500/5'
                  : 'border-[#c7c4d7] bg-white/50 hover:border-[#4441cc]/50 hover:bg-white/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-[#4441cc]/10 text-[#4441cc] flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl">
                  {selectedFile ? 'task_alt' : 'upload_file'}
                </span>
              </div>

              {selectedFile ? (
                <div>
                  <h4 className="text-sm font-bold text-[#1a1c1c]">{selectedFile.name}</h4>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for ingestion
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-bold text-[#1a1c1c]">
                    Drag & drop university document here
                  </h4>
                  <p className="text-xs text-[#464554] mt-1">
                    or <span className="text-[#4441cc] font-semibold underline">browse file</span> from computer (PDF, DOCX, TXT max 25MB)
                  </p>
                </div>
              )}
            </div>

            {/* Document Title Input */}
            <div>
              <label className="block text-xs font-bold text-[#1a1c1c] mb-1">
                Document Display Title
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="e.g. B.Tech Computer Science Syllabus 2026"
                className="w-full px-4 py-2.5 rounded-xl bg-white/70 border border-[#c7c4d7] text-sm text-[#1a1c1c] focus:outline-none focus:ring-2 focus:ring-[#4441cc]/40"
              />
            </div>

            {/* Category Selection Dropdown */}
            <div>
              <label className="block text-xs font-bold text-[#1a1c1c] mb-1">
                Document Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/70 border border-[#c7c4d7] text-sm text-[#1a1c1c] focus:outline-none focus:ring-2 focus:ring-[#4441cc]/40"
              >
                {categories
                  .filter((c) => c.id !== 'all')
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/20">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#464554] hover:bg-white/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={simulateIngestionPipeline}
                disabled={!selectedFile && !documentTitle}
                className={`px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white transition-all shadow-md ${
                  selectedFile || documentTitle
                    ? 'bg-[#4441cc] hover:bg-[#4441cc]/90 shadow-[#4441cc]/20'
                    : 'bg-[#777586]/40 cursor-not-allowed'
                }`}
              >
                Start Ingestion & Indexing
              </button>
            </div>
          </div>
        ) : (
          /* Live Pipeline Progress View */
          <div className="py-8 space-y-6 text-center">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#4441cc]/20 border-t-[#4441cc] animate-spin" />
              <span className="material-symbols-outlined text-3xl text-[#4441cc]">memory</span>
            </div>

            <div>
              <h4 className="text-base font-bold text-[#1a1c1c] mb-1">
                Ingesting Document Pipeline
              </h4>
              <p className="text-xs font-medium text-[#4441cc] animate-pulse">
                {currentStepText}
              </p>
            </div>

            {/* Neural Progress Bar */}
            <div className="w-full bg-white/60 h-3 rounded-full overflow-hidden p-0.5 border border-white/40">
              <div
                className="h-full rounded-full neural-progress transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-[#464554] px-1 font-semibold">
              <span>Progress: {uploadProgress}%</span>
              <span>Milvus Vector Engine</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
