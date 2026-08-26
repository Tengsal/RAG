'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminOverview } from '@/components/admin/admin-overview';
import { DocumentTable } from '@/components/admin/document-table';
import { UploadModal } from '@/components/admin/upload-modal';
import { DocumentDetailsModal } from '@/components/admin/document-details-modal';
import {
  INITIAL_DOCUMENTS,
  INITIAL_CATEGORIES,
  INITIAL_METRICS,
  AdminDocument,
} from '@/components/admin/mock-data';
import { AuthGuard } from '@/components/auth-guard';

export const dynamic = 'force-dynamic';

function AdminContent() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Datasets Client State
  const [documents, setDocuments] = useState<AdminDocument[]>(INITIAL_DOCUMENTS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);

  // Modals & Active Selections
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<AdminDocument | null>(null);

  // Notification Toast simulation
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handlers
  const handleAddDocument = (newDoc: AdminDocument) => {
    setDocuments((prev) => [newDoc, ...prev]);

    // Update category counts
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === 'all') return { ...cat, count: cat.count + 1 };
        if (cat.name === newDoc.category) return { ...cat, count: cat.count + 1 };
        return cat;
      })
    );

    showToast(`Successfully ingested and indexed "${newDoc.title}"`);
  };

  const handleReindexDocument = (doc: AdminDocument) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, status: 'processing' } : d))
    );
    showToast(`Started vector re-indexing for "${doc.title}"`);

    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: 'ready',
                vectorChunks: d.vectorChunks + Math.floor(Math.random() * 10) + 1,
                citationScore: +(96 + Math.random() * 3).toFixed(1),
              }
            : d
        )
      );
      showToast(`Re-indexing completed for "${doc.title}" (100% ground accuracy)`);
    }, 3000);
  };

  const handleReplaceDocument = (doc: AdminDocument) => {
    showToast(`Simulated replacement file picker launched for "${doc.fileName}"`);
  };

  const handleDeleteDocument = (docId: string) => {
    const target = documents.find((d) => d.id === docId);
    if (!target) return;

    if (confirm(`Are you sure you want to delete "${target.title}" from the knowledge base?`)) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDocument?.id === docId) setSelectedDocument(null);
      showToast(`Deleted "${target.title}" from vector repository`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c] font-['Geist'] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        totalDocsCount={documents.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <AdminHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          unreadCount={documents.filter((d) => d.status === 'failed').length}
        />

        {/* Workspace Body */}
        <main className="flex-1 px-6 sm:px-10 max-w-[1440px] w-full mx-auto pb-16">
          {/* Simulated Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#1a1c1c] text-white text-xs font-semibold shadow-2xl animate-in slide-in-from-bottom duration-300">
              <span className="material-symbols-outlined text-emerald-400">check_circle</span>
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="ml-2 opacity-70 hover:opacity-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* Render Active View Tab */}
          {activeTab === 'overview' || activeTab === 'documents' ? (
            <>
              {/* Dashboard Banner & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#1a1c1c] tracking-tight">
                    Document Knowledge Base Admin
                  </h2>
                  <p className="text-sm text-[#464554] mt-1">
                    Manage university documents, verify citation accuracy, and monitor RAG vector indexing.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/documents"
                    className="px-4 py-2 rounded-full glass-card text-xs font-semibold text-[#1a1c1c] hover:bg-white transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">public</span>
                    <span>View Public Docs</span>
                  </Link>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-5 py-2 rounded-full bg-[#4441cc] text-white text-xs font-semibold hover:bg-[#4441cc]/90 transition-all shadow-md flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Upload Document</span>
                  </button>
                </div>
              </div>

              {/* Metric Cards Overview */}
              <AdminOverview
                metrics={INITIAL_METRICS}
                documents={documents}
                onSelectFilterStatus={(status) => {
                  setFilterStatus(status);
                  setActiveTab('documents');
                }}
              />

              {/* Searchable/Filterable Data Table */}
              <DocumentTable
                documents={documents}
                categories={categories}
                filterCategory={filterCategory}
                setFilterCategory={setFilterCategory}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onViewDocument={(doc) => setSelectedDocument(doc)}
                onReindexDocument={handleReindexDocument}
                onReplaceDocument={handleReplaceDocument}
                onDeleteDocument={handleDeleteDocument}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
              />
            </>
          ) : activeTab === 'pipeline' ? (
            /* Ingestion Pipeline Tab View */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#1a1c1c]">Ingestion & Vector Pipeline</h2>
                  <p className="text-xs text-[#464554]">
                    Real-time monitoring of document chunking, embedding generation, and Milvus vector indexing.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 rounded-3xl space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#4441cc]/10 text-[#4441cc] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">description</span>
                  </div>
                  <h3 className="font-bold text-base">1. Document Parsing</h3>
                  <p className="text-xs text-[#464554] leading-relaxed">
                    Parses PDFs, Word documents, and text files. Extracts text hierarchies, tables, and section headings.
                  </p>
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                    PDFPlumber & Unstructured Engine Active
                  </span>
                </div>

                <div className="glass-card p-6 rounded-3xl space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#9026c3]/10 text-[#9026c3] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">extension</span>
                  </div>
                  <h3 className="font-bold text-base">2. Semantic Chunking</h3>
                  <p className="text-xs text-[#464554] leading-relaxed">
                    Splits texts into 512-token chunks with 64-token overlap to maintain academic context across boundaries.
                  </p>
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-[#9026c3]/10 text-[#9026c3]">
                    Recursive Character Chunking
                  </span>
                </div>

                <div className="glass-card p-6 rounded-3xl space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0055a9]/10 text-[#0055a9] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">memory</span>
                  </div>
                  <h3 className="font-bold text-base">3. Vector Indexing</h3>
                  <p className="text-xs text-[#464554] leading-relaxed">
                    Generates 1024-dimension embeddings via bge-large-en and builds HNSW index in Milvus DB.
                  </p>
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-[#0055a9]/10 text-[#0055a9]">
                    Milvus DB HNSW Index
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Settings & Analytics Placeholder Tab */
            <div className="glass-card p-12 rounded-3xl text-center space-y-4 max-w-xl mx-auto my-12">
              <div className="w-16 h-16 rounded-3xl bg-[#4441cc]/10 text-[#4441cc] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl">construction</span>
              </div>
              <h3 className="text-xl font-bold text-[#1a1c1c]">Configuration & System Analytics</h3>
              <p className="text-xs text-[#464554] leading-relaxed">
                Advanced vector distance thresholds, confidence cutoffs, and RAG evaluation metrics are active with optimal default settings.
              </p>
              <button
                onClick={() => setActiveTab('overview')}
                className="px-5 py-2.5 rounded-full bg-[#4441cc] text-white text-xs font-semibold hover:bg-[#4441cc]/90 transition-all shadow-md"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Upload Document Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        categories={categories}
        onAddDocument={handleAddDocument}
      />

      {/* Document Details Modal */}
      <DocumentDetailsModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onReindex={handleReindexDocument}
        onDelete={handleDeleteDocument}
      />
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <Suspense fallback={<div className="flex h-screen items-center justify-center font-['Geist'] text-sm">Loading Admin Console...</div>}>
        <AdminContent />
      </Suspense>
    </AuthGuard>
  );
}
