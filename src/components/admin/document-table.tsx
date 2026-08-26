'use client';

import React, { useState } from 'react';
import { AdminDocument, DocumentCategory } from './mock-data';

interface DocumentTableProps {
  documents: AdminDocument[];
  categories: DocumentCategory[];
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onViewDocument: (doc: AdminDocument) => void;
  onReindexDocument: (doc: AdminDocument) => void;
  onReplaceDocument: (doc: AdminDocument) => void;
  onDeleteDocument: (docId: string) => void;
  onOpenUploadModal: () => void;
}

export function DocumentTable({
  documents,
  categories,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
  onViewDocument,
  onReindexDocument,
  onReplaceDocument,
  onDeleteDocument,
  onOpenUploadModal,
}: DocumentTableProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Filter documents based on searchQuery, category, and status
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      filterCategory === 'all' || doc.categoryId === filterCategory;

    const matchesStatus =
      filterStatus === 'all' || doc.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage) || 1;
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: AdminDocument['status']) => {
    switch (status) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Ready / Indexed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#9026c3]/10 text-[#9026c3] border border-[#9026c3]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9026c3] animate-ping" />
            Ingesting...
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-700 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Failed / OCR Error
          </span>
        );
      default:
        return null;
    }
  };

  const getFileTypeIcon = (type: AdminDocument['fileType']) => {
    switch (type) {
      case 'pdf':
        return { icon: 'picture_as_pdf', color: 'text-red-500 bg-red-50' };
      case 'docx':
        return { icon: 'description', color: 'text-blue-600 bg-blue-50' };
      case 'txt':
        return { icon: 'article', color: 'text-amber-600 bg-amber-50' };
      default:
        return { icon: 'draft', color: 'text-gray-600 bg-gray-50' };
    }
  };

  return (
    <div className="glass-card rounded-3xl border border-white/40 shadow-sm overflow-hidden mb-12">
      {/* Header Controls & Filters */}
      <div className="p-6 border-b border-white/20 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#1a1c1c] tracking-tight">
              Knowledge Base Documents
            </h3>
            <p className="text-xs text-[#464554]">
              Showing {filteredDocuments.length} of {documents.length} university documents
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Quick Upload CTA */}
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#4441cc] text-white font-semibold text-xs hover:bg-[#4441cc]/90 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add Document</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white/50 border border-white/40">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'ready', label: 'Ready' },
              { id: 'processing', label: 'Processing' },
              { id: 'failed', label: 'Failed' },
            ].map((tab) => {
              const isActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilterStatus(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#4441cc] text-white shadow-sm'
                      : 'text-[#464554] hover:text-[#1a1c1c] hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3.5 py-1.5 rounded-2xl bg-white/70 border border-white/50 text-xs font-semibold text-[#1a1c1c] focus:outline-none focus:ring-2 focus:ring-[#4441cc]/40"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>

            {/* Clear Filters pill if active */}
            {(filterCategory !== 'all' || filterStatus !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setFilterCategory('all');
                  setFilterStatus('all');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-red-500/10 text-red-700 text-xs font-semibold border border-red-200 hover:bg-red-500/20 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">clear_all</span>
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Data View */}
      <div className="overflow-x-auto">
        {paginatedDocuments.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/40 border-b border-white/20 text-[11px] font-bold text-[#464554] uppercase tracking-wider">
                <th className="py-3.5 px-6">Document Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Upload Date</th>
                <th className="py-3.5 px-4">Pages & Size</th>
                <th className="py-3.5 px-4">Ingestion Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/20 text-sm">
              {paginatedDocuments.map((doc) => {
                const fileIcon = getFileTypeIcon(doc.fileType);
                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-white/60 transition-colors duration-150 group"
                  >
                    {/* Document Name */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${fileIcon.color} shadow-sm shrink-0`}
                        >
                          <span className="material-symbols-outlined text-xl">
                            {fileIcon.icon}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#1a1c1c] text-sm group-hover:text-[#4441cc] transition-colors truncate max-w-xs sm:max-w-md">
                            {doc.title}
                          </h4>
                          <p className="text-xs text-[#464554] truncate max-w-xs">
                            {doc.fileName}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#4441cc]/10 text-[#4441cc] border border-[#4441cc]/20">
                        {doc.category}
                      </span>
                    </td>

                    {/* Upload Date */}
                    <td className="py-4 px-4 text-xs font-medium text-[#464554]">
                      {doc.uploadDate}
                    </td>

                    {/* Pages & Size */}
                    <td className="py-4 px-4 text-xs font-medium text-[#1a1c1c]">
                      <div>{doc.pageCount} Pages</div>
                      <div className="text-[11px] text-[#464554]">{doc.fileSize}</div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">{getStatusBadge(doc.status)}</td>

                    {/* Action Buttons */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Button */}
                        <button
                          onClick={() => onViewDocument(doc)}
                          className="p-2 rounded-xl text-[#4441cc] hover:bg-[#4441cc]/10 transition-colors"
                          title="View Document Details & Chunks"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>

                        {/* Re-index Button */}
                        <button
                          onClick={() => onReindexDocument(doc)}
                          className="p-2 rounded-xl text-[#9026c3] hover:bg-[#9026c3]/10 transition-colors"
                          title="Re-index Vector Embeddings"
                        >
                          <span className="material-symbols-outlined text-lg">sync</span>
                        </button>

                        {/* Replace Button */}
                        <button
                          onClick={() => onReplaceDocument(doc)}
                          className="p-2 rounded-xl text-[#0055a9] hover:bg-[#0055a9]/10 transition-colors"
                          title="Replace Document File"
                        >
                          <span className="material-symbols-outlined text-lg">swap_horiz</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => onDeleteDocument(doc.id)}
                          className="p-2 rounded-xl text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors"
                          title="Delete Document"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* Empty State */
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#4441cc]/10 text-[#4441cc] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">find_in_page</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-[#1a1c1c]">No documents found</h4>
              <p className="text-xs text-[#464554] mt-1 max-w-sm mx-auto">
                No university documents match your current search query or filter selections.
              </p>
            </div>
            <button
              onClick={() => {
                setFilterCategory('all');
                setFilterStatus('all');
                setSearchQuery('');
              }}
              className="px-5 py-2 rounded-full bg-[#4441cc] text-white text-xs font-semibold hover:bg-[#4441cc]/90 transition-all shadow-sm"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredDocuments.length > 0 && (
        <div className="p-4 border-t border-white/20 flex items-center justify-between text-xs text-[#464554]">
          <span>
            Page {currentPage} of {totalPages} ({filteredDocuments.length} Total Results)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                currentPage === 1
                  ? 'opacity-40 border-white/20 cursor-not-allowed'
                  : 'border-white/50 bg-white/60 hover:bg-white text-[#1a1c1c]'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                currentPage === totalPages
                  ? 'opacity-40 border-white/20 cursor-not-allowed'
                  : 'border-white/50 bg-white/60 hover:bg-white text-[#1a1c1c]'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
