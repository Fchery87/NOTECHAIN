'use client';

import { useState, useCallback } from 'react';
import type { PDFDocument, PDFAnnotation } from '@notechain/data-models';
import { PDFViewer } from '@/components/PDFViewer';

// Mock PDF data matching the actual interface
const mockPDFs: PDFDocument[] = [
  {
    id: '1',
    userId: 'user-1',
    originalFileName: 'Project_Proposal.pdf',
    title: 'Project Proposal',
    author: 'John Doe',
    pageCount: 12,
    fileSize: 2457600,
    annotations: [],
    signatures: [],
    storageKey: 'storage-1',
    thumbnailKey: 'thumb-1',
    encryptionKeyId: 'key-1',
    createdAt: new Date(Date.now() - 86400000 * 3),
    updatedAt: new Date(Date.now() - 86400000 * 3),
    isDeleted: false,
  },
  {
    id: '2',
    userId: 'user-1',
    originalFileName: 'Contract_Draft.pdf',
    title: 'Contract Draft',
    pageCount: 8,
    fileSize: 1843200,
    annotations: [],
    signatures: [],
    storageKey: 'storage-2',
    thumbnailKey: 'thumb-2',
    encryptionKeyId: 'key-2',
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date(Date.now() - 86400000),
    isDeleted: false,
  },
  {
    id: '3',
    userId: 'user-1',
    originalFileName: 'Research_Paper.pdf',
    title: 'Research Paper',
    pageCount: 24,
    fileSize: 4096000,
    annotations: [],
    signatures: [],
    storageKey: 'storage-3',
    thumbnailKey: 'thumb-3',
    encryptionKeyId: 'key-3',
    createdAt: new Date(Date.now() - 86400000 * 7),
    updatedAt: new Date(Date.now() - 86400000 * 7),
    isDeleted: false,
  },
];

export default function PDFsPage() {
  const [pdfs, setPdfs] = useState<PDFDocument[]>(mockPDFs);
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectedPdf = pdfs.find(p => p.id === selectedPdfId);

  const handlePdfSelect = useCallback((pdfId: string) => {
    setSelectedPdfId(pdfId);
  }, []);

  const handleAddAnnotation = useCallback(
    (annotation: Omit<PDFAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) => {
      if (!selectedPdfId) return;

      const newAnnotation: PDFAnnotation = {
        ...annotation,
        id: `ann-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isDeleted: false,
      };

      setPdfs(prev =>
        prev.map(pdf =>
          pdf.id === selectedPdfId
            ? { ...pdf, annotations: [...pdf.annotations, newAnnotation] }
            : pdf
        )
      );
    },
    [selectedPdfId]
  );

  const handleDeleteAnnotation = useCallback(
    (annotationId: string) => {
      if (!selectedPdfId) return;

      setPdfs(prev =>
        prev.map(pdf =>
          pdf.id === selectedPdfId
            ? { ...pdf, annotations: pdf.annotations.filter(a => a.id !== annotationId) }
            : pdf
        )
      );
    },
    [selectedPdfId]
  );

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newPdf: PDFDocument = {
      id: `pdf-${Date.now()}`,
      userId: 'user-1',
      originalFileName: file.name,
      title: file.name.replace('.pdf', ''),
      pageCount: Math.floor(Math.random() * 20) + 1,
      fileSize: file.size,
      annotations: [],
      signatures: [],
      storageKey: `storage-${Date.now()}`,
      thumbnailKey: `thumb-${Date.now()}`,
      encryptionKeyId: `key-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };

    setPdfs(prev => [newPdf, ...prev]);
    setIsUploading(false);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="font-serif text-2xl font-medium text-stone-900">
                NoteChain
              </a>
              <span className="text-stone-300">/</span>
              <span className="text-lg text-stone-700">PDFs</span>
            </div>

            <div className="flex items-center gap-4">
              <label className="px-4 py-2 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer">
                {isUploading ? 'Uploading...' : '+ Upload PDF'}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PDF List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="p-4 border-b border-stone-200">
                <h2 className="font-medium text-stone-900">Your Documents</h2>
                <p className="text-sm text-stone-500 mt-1">
                  {pdfs.length} document{pdfs.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {pdfs.map(pdf => (
                  <button
                    key={pdf.id}
                    onClick={() => handlePdfSelect(pdf.id)}
                    className={`w-full text-left p-4 border-b border-stone-100 last:border-b-0 transition-colors ${
                      selectedPdfId === pdf.id
                        ? 'bg-amber-50 border-amber-200'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-stone-900 truncate">
                          {pdf.originalFileName}
                        </h3>
                        <p className="text-sm text-stone-500">
                          {pdf.pageCount} pages • {formatFileSize(pdf.fileSize)} •{' '}
                          {formatDate(pdf.createdAt)}
                        </p>
                        {pdf.annotations.length > 0 && (
                          <span className="inline-flex items-center gap-1 mt-1 text-xs text-amber-600">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                            {pdf.annotations.length} annotation
                            {pdf.annotations.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="lg:col-span-2">
            {selectedPdf ? (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200">
                <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                  <div>
                    <h2 className="font-medium text-stone-900">{selectedPdf.originalFileName}</h2>
                    <p className="text-sm text-stone-500">
                      {selectedPdf.pageCount} pages • Last modified{' '}
                      {formatDate(selectedPdf.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="p-4">
                  <PDFViewer
                    pdf={selectedPdf}
                    onAddAnnotation={handleAddAnnotation}
                    onDeleteAnnotation={handleDeleteAnnotation}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 min-h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-stone-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-stone-900 mb-2">No PDF Selected</h3>
                  <p className="text-stone-600 max-w-sm">
                    Select a PDF from the list to view, annotate, and sign documents securely.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
