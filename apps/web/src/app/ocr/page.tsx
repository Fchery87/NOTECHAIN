'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ImageOCRUploader } from '@/components/ImageOCRUploader';
import { OCRResult, createOCRStorage } from '@/lib/storage/ocrStorage';

/**
 * OCR Page
 *
 * Main page for document intelligence and text extraction.
 * Allows users to extract text from images and view recent extractions.
 */
export default function OCRPage() {
  const [recentResults, setRecentResults] = useState<OCRResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<OCRResult | null>(null);
  const [storage] = useState(() => createOCRStorage());

  // Load recent OCR results on mount
  useEffect(() => {
    const loadRecentResults = async () => {
      try {
        setIsLoading(true);
        // Get encryption key - in production this would come from secure storage
        const key = new Uint8Array(32).fill(1);
        const results = await storage.getRecentOCRResults(5, key);
        setRecentResults(results);
      } catch (error) {
        console.error('Failed to load recent OCR results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentResults();
  }, [storage]);

  // Handle text extraction from image
  const handleTextExtracted = useCallback(
    async (text: string, _image: File) => {
      try {
        // Save the OCR result to storage
        const key = new Uint8Array(32).fill(1);
        await storage.saveOCRResult(
          {
            documentId: `image-${Date.now()}`,
            documentType: 'image',
            text,
            confidence: 90, // Default confidence
            language: 'eng',
            wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
          },
          key
        );

        // Refresh the recent results
        const results = await storage.getRecentOCRResults(5, key);
        setRecentResults(results);
      } catch (error) {
        console.error('Failed to save OCR result:', error);
      }
    },
    [storage]
  );

  // Handle viewing a result
  const handleViewResult = useCallback((result: OCRResult) => {
    setSelectedResult(result);
  }, []);

  // Handle deleting a result
  const handleDeleteResult = useCallback(
    async (id: string) => {
      if (!window.confirm('Are you sure you want to delete this extraction?')) {
        return;
      }

      try {
        await storage.deleteOCRResult(id);
        setRecentResults(prev => prev.filter(r => r.id !== id));
      } catch (error) {
        console.error('Failed to delete OCR result:', error);
      }
    },
    [storage]
  );

  // Close the detail modal
  const handleCloseModal = useCallback(() => {
    setSelectedResult(null);
  }, []);

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // Get text preview (first 100 characters)
  const getTextPreview = (text: string): string => {
    if (text.length <= 100) return text;
    return text.substring(0, 100) + '...';
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return 'text-green-600 bg-green-50';
    if (confidence >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  return (
    <div data-testid="ocr-page" className="min-h-screen bg-stone-50">
      {/* Header */}
      <header data-testid="ocr-header" className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div>
            <h1 className="font-serif text-3xl font-medium text-stone-900 mb-2">
              OCR & Document Intelligence
            </h1>
            <p className="text-stone-600 max-w-2xl">
              Extract text from images and PDFs using AI. All processing happens locally on your
              device for maximum privacy.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* OCR Uploader */}
        <section className="mb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <ImageOCRUploader onTextExtracted={handleTextExtracted} />
          </div>
        </section>

        {/* Recent Extractions */}
        <section>
          <h2 className="font-serif text-2xl font-medium text-stone-900 mb-6">
            Recent Extractions
          </h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-stone-300 border-t-amber-500"></div>
              <p className="mt-4 text-stone-500">Loading recent extractions...</p>
            </div>
          ) : recentResults.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-stone-900">No recent extractions</h3>
              <p className="mt-2 text-stone-500">
                Upload an image above to extract text and see it here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {recentResults.map(result => (
                <div
                  key={result.id}
                  className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Document Type Icon */}
                    <div className="flex-shrink-0">
                      {result.documentType === 'image' ? (
                        <div
                          data-testid="doc-type-image"
                          className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center"
                        >
                          <svg
                            className="w-6 h-6 text-amber-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div
                          data-testid="doc-type-pdf"
                          className="w-12 h-12 rounded-lg bg-rose-50 flex items-center justify-center"
                        >
                          <svg
                            className="w-6 h-6 text-rose-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-stone-700 text-sm leading-relaxed mb-3">
                        {getTextPreview(result.text)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-stone-500">
                        <span>{formatDate(result.createdAt)}</span>
                        <span
                          className={`px-2 py-1 rounded-full font-medium ${getConfidenceColor(result.confidence)}`}
                        >
                          {result.confidence}% confidence
                        </span>
                        <span>{result.wordCount} words</span>
                        {result.pageNumber && <span>Page {result.pageNumber}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewResult(result)}
                        className="px-3 py-1.5 text-sm font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteResult(result.id)}
                        aria-label="Delete extraction"
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Detail Modal */}
      {selectedResult && (
        <div
          data-testid="ocr-detail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl font-medium text-stone-900">Extracted Text</h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-4 text-sm text-stone-500 mb-4">
                <span>{formatDate(selectedResult.createdAt)}</span>
                <span
                  className={`px-2 py-1 rounded-full font-medium ${getConfidenceColor(selectedResult.confidence)}`}
                >
                  {selectedResult.confidence}% confidence
                </span>
                <span>{selectedResult.wordCount} words</span>
              </div>

              <textarea
                readOnly
                value={selectedResult.text}
                rows={12}
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 resize-none focus:outline-none"
              />

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(selectedResult.text);
                    } catch (err) {
                      console.error('Failed to copy text:', err);
                    }
                  }}
                  className="px-4 py-2 bg-stone-100 text-stone-700 font-medium rounded-lg hover:bg-stone-200 transition-colors"
                >
                  Copy Text
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
