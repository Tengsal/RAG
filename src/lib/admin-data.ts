export type IngestionStatus = 'ready' | 'processing' | 'failed';

export interface DocumentCategory {
  id: string;
  name: string;
  count: number;
}

export interface AdminDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  category: string;
  categoryId: string;
  uploadDate: string;
  fileSize: string;
  pageCount: number;
  status: IngestionStatus;
  vectorChunks: number;
  citationScore: number;
  excerpt: string;
  ingestionLogs: {
    timestamp: string;
    step: string;
    status: 'completed' | 'in-progress' | 'error';
    details: string;
  }[];
}

export interface MetricStat {
  id: string;
  label: string;
  value: string | number;
  subtext: string;
  change: string;
  isPositive: boolean;
  icon: string;
  colorHex: string;
  bgClass: string;
}

export const INITIAL_CATEGORIES: DocumentCategory[] = [
  { id: 'all', name: 'All Categories', count: 148 },
  { id: 'academic', name: 'Academic Regulations', count: 42 },
  { id: 'admissions', name: 'Admission Policies', count: 31 },
  { id: 'syllabus', name: 'Syllabus & Curricula', count: 38 },
  { id: 'examinations', name: 'Examination Rules', count: 22 },
  { id: 'circulars', name: 'Campus Circulars', count: 15 },
];

export const INITIAL_DOCUMENTS: AdminDocument[] = [
  {
    id: 'doc-101',
    title: 'AdtU B.Tech Academic Regulations 2024-25',
    fileName: 'BTech_Academic_Regulations_2024.pdf',
    fileType: 'pdf',
    category: 'Academic Regulations',
    categoryId: 'academic',
    uploadDate: '2026-08-24 10:30 AM',
    fileSize: '4.8 MB',
    pageCount: 64,
    status: 'ready',
    vectorChunks: 128,
    citationScore: 98.4,
    excerpt: 'Clause 4.2: Credit distribution for B.Tech Core subjects requires a minimum of 160 credits over 8 semesters with 85% mandatory attendance in practical sessions.',
    ingestionLogs: [
      { timestamp: '10:30:02', step: 'PDF Document Received', status: 'completed', details: 'File size 4.8MB validated' },
      { timestamp: '10:30:05', step: 'Text & Metadata Extracted', status: 'completed', details: '64 pages parsed successfully' },
      { timestamp: '10:30:12', step: 'Chunking & Embedding Generation', status: 'completed', details: '128 dense vector chunks created' },
      { timestamp: '10:30:18', step: 'Milvus Vector DB Indexing', status: 'completed', details: 'HNSW index built with 98.4% recall' },
    ],
  },
  {
    id: 'doc-102',
    title: 'Undergraduate Admission Policy & Eligibility Criteria 2026',
    fileName: 'UG_Admission_Policy_2026.pdf',
    fileType: 'pdf',
    category: 'Admission Policies',
    categoryId: 'admissions',
    uploadDate: '2026-08-25 02:15 PM',
    fileSize: '2.3 MB',
    pageCount: 32,
    status: 'ready',
    vectorChunks: 74,
    citationScore: 96.8,
    excerpt: 'Section 2.1: Candidates seeking admission to B.Tech programs must have secured a aggregate of 60% in Physics, Chemistry, and Mathematics in Class XII examination.',
    ingestionLogs: [
      { timestamp: '14:15:01', step: 'PDF Document Received', status: 'completed', details: 'File size 2.3MB' },
      { timestamp: '14:15:04', step: 'Text & Metadata Extracted', status: 'completed', details: '32 pages parsed' },
      { timestamp: '14:15:09', step: 'Chunking & Embedding Generation', status: 'completed', details: '74 vector chunks generated' },
      { timestamp: '14:15:14', step: 'Milvus Vector DB Indexing', status: 'completed', details: 'Indexed successfully' },
    ],
  },
  {
    id: 'doc-103',
    title: 'Computer Science & Engineering Sem 6 Syllabus',
    fileName: 'CSE_Sem6_Syllabus_2026.docx',
    fileType: 'docx',
    category: 'Syllabus & Curricula',
    categoryId: 'syllabus',
    uploadDate: '2026-08-26 11:05 AM',
    fileSize: '1.9 MB',
    pageCount: 28,
    status: 'processing',
    vectorChunks: 45,
    citationScore: 89.2,
    excerpt: 'Module 3: Neural Information Retrieval & RAG Architecture. Covers HNSW indexing, reciprocal rank fusion, and uncertainty-aware response generation.',
    ingestionLogs: [
      { timestamp: '11:05:00', step: 'DOCX File Uploaded', status: 'completed', details: 'File size 1.9MB' },
      { timestamp: '11:05:03', step: 'Document Structure Analysis', status: 'completed', details: 'Parsed headings and course modules' },
      { timestamp: '11:05:10', step: 'Vector Embedding Pipeline', status: 'in-progress', details: 'Generating embeddings for Module 3...' },
    ],
  },
  {
    id: 'doc-104',
    title: 'University Examination Ordinance & Malpractice Guidelines',
    fileName: 'Exam_Ordinance_Malpractice_Rules.pdf',
    fileType: 'pdf',
    category: 'Examination Rules',
    categoryId: 'examinations',
    uploadDate: '2026-08-23 09:40 AM',
    fileSize: '3.1 MB',
    pageCount: 44,
    status: 'ready',
    vectorChunks: 92,
    citationScore: 99.1,
    excerpt: 'Rule 14.3: Possession of unauthorized electronic devices during semester examinations leads to automatic cancellation of the paper and disciplinary committee hearing.',
    ingestionLogs: [
      { timestamp: '09:40:02', step: 'PDF Document Received', status: 'completed', details: 'File size 3.1MB' },
      { timestamp: '09:40:07', step: 'Text & Metadata Extracted', status: 'completed', details: '44 pages parsed' },
      { timestamp: '09:40:15', step: 'Chunking & Embedding Generation', status: 'completed', details: '92 vector chunks generated' },
      { timestamp: '09:40:22', step: 'Milvus Vector DB Indexing', status: 'completed', details: 'Index built' },
    ],
  },
  {
    id: 'doc-105',
    title: 'Hostel Accommodation & Fee Structure Circular 2026',
    fileName: 'Hostel_Fee_Circular_2026.pdf',
    fileType: 'pdf',
    category: 'Campus Circulars',
    categoryId: 'circulars',
    uploadDate: '2026-08-26 09:00 AM',
    fileSize: '1.2 MB',
    pageCount: 12,
    status: 'failed',
    vectorChunks: 0,
    citationScore: 0,
    excerpt: 'Error parsing table structure on Page 4. OCR failed to align hostel mess fee columns. Manual re-indexing or re-upload required.',
    ingestionLogs: [
      { timestamp: '09:00:01', step: 'PDF File Received', status: 'completed', details: 'File size 1.2MB' },
      { timestamp: '09:00:04', step: 'OCR Text Extraction', status: 'error', details: 'Font encoding corrupted on page 4 tables' },
    ],
  },
];

export const INITIAL_METRICS: MetricStat[] = [
  {
    id: 'total-docs',
    label: 'Total Knowledge Base Docs',
    value: 148,
    subtext: 'Indexed documents in system',
    change: '+12% this month',
    isPositive: true,
    icon: 'description',
    colorHex: '#4441cc',
    bgClass: 'bg-[#4441cc]/10',
  },
  {
    id: 'ready-docs',
    label: 'Ready & Grounded',
    value: 132,
    subtext: '92% high-confidence coverage',
    change: 'Active in RAG',
    isPositive: true,
    icon: 'task_alt',
    colorHex: '#10b981',
    bgClass: 'bg-[#10b981]/10',
  },
  {
    id: 'processing-docs',
    label: 'Ingestion Queue',
    value: 11,
    subtext: 'Average 4.2s / document',
    change: 'Live chunking',
    isPositive: true,
    icon: 'sync',
    colorHex: '#9026c3',
    bgClass: 'bg-[#9026c3]/10',
  },
  {
    id: 'failed-docs',
    label: 'Failed / Flagged',
    value: 5,
    subtext: 'Requires OCR or re-indexing',
    change: 'Action needed',
    isPositive: false,
    icon: 'error_outline',
    colorHex: '#ba1a1a',
    bgClass: 'bg-[#ba1a1a]/10',
  },
];
