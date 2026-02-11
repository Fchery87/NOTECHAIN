'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { OCRService } from '@/lib/ocr';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  confidence: number;
}

export interface PDFTextExtractorProps {
  pdfBlob: Blob;
  pdfName: string;
  onTextExtracted?: (text: string, pageNumber?: number) => void;
  onClose?: () => void;
}

export function PDFTextExtractor({
  pdfBlob,
  pdfName,
  onTextExtracted,
  onClose,
}: PDFTextExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedPages, setExtractedPages] = useState<ExtractedPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);

  // Process multi-page text result into individual pages
  const parseMultiPageResult = useCallback(
    (text: string, pageCount: number, confidence: number): ExtractedPage[] => {
      // Split by double newline to separate pages
      const pages = text.split(/\n\n+/).filter(page => page.trim());

      const extractedPages: ExtractedPage[] = [];
      for (let i = 0; i < pageCount; i++) {
        extractedPages.push({
          pageNumber: i + 1,
          text: pages[i]?.trim() || `Page ${i + 1}`,
          confidence,
        });
      }
      return extractedPages;
    },
    []
  );

  const handleExtractText = useCallback(async () => {
    setIsExtracting(true);
    setProgress(0);
    setError(null);
    setShowModal(true);
    setSearchQuery('');
    setSearchResults([]);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 5;
      });
    }, 200);

    try {
      const ocrService = new OCRService();
      await ocrService.initialize();

      const result = await ocrService.extractTextFromPDF(pdfBlob);

      clearInterval(progressInterval);
      setProgress(100);

      const pages = parseMultiPageResult(result.text, result.pageCount, result.confidence);
      setExtractedPages(pages);
      setTotalPages(result.pageCount);
      setCurrentPageIndex(0);
      setIsExtracting(false);

      if (onTextExtracted) {
        onTextExtracted(pages[0]?.text || '', 1);
      }

      await ocrService.terminate();
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Failed to extract text from PDF');
      setIsExtracting(false);
    }
  }, [pdfBlob, onTextExtracted, parseMultiPageResult]);

  const handlePageChange = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev' && currentPageIndex > 0) {
        const newIndex = currentPageIndex - 1;
        setCurrentPageIndex(newIndex);
        if (onTextExtracted) {
          onTextExtracted(extractedPages[newIndex]?.text || '', newIndex + 1);
        }
      } else if (direction === 'next' && currentPageIndex < extractedPages.length - 1) {
        const newIndex = currentPageIndex + 1;
        setCurrentPageIndex(newIndex);
        if (onTextExtracted) {
          onTextExtracted(extractedPages[newIndex]?.text || '', newIndex + 1);
        }
      }
    },
    [currentPageIndex, extractedPages, onTextExtracted]
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      const results: number[] = [];
      const lowerQuery = query.toLowerCase();

      extractedPages.forEach((page, index) => {
        if (page.text.toLowerCase().includes(lowerQuery)) {
          results.push(index);
        }
      });

      setSearchResults(results);
    },
    [extractedPages]
  );

  const handleCopyText = useCallback(async () => {
    const currentText = extractedPages[currentPageIndex]?.text || '';
    try {
      await navigator.clipboard.writeText(currentText);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }, [extractedPages, currentPageIndex]);

  const handleCopyAll = useCallback(async () => {
    const allText = extractedPages.map(page => page.text).join('\n\n');
    try {
      await navigator.clipboard.writeText(allText);
    } catch (err) {
      console.error('Failed to copy all text:', err);
    }
  }, [extractedPages]);

  const handleSaveToNote = useCallback(() => {
    if (onTextExtracted) {
      const currentText = extractedPages[currentPageIndex]?.text || '';
      onTextExtracted(currentText, currentPageIndex + 1);
    }
  }, [extractedPages, currentPageIndex, onTextExtracted]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setIsExtracting(false);
    setProgress(0);
    setError(null);
    setExtractedPages([]);
    setCurrentPageIndex(0);
    setSearchQuery('');
    setSearchResults([]);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleCloseModal();
      }
    },
    [handleCloseModal]
  );

  const currentPage = extractedPages[currentPageIndex];
  const matchCount = searchResults.length;

  // Highlight search matches in text
  const highlightedText = useMemo(() => {
    if (!currentPage?.text || !searchQuery.trim()) {
      return currentPage?.text || '';
    }

    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return currentPage.text.replace(regex, '**$1**');
  }, [currentPage?.text, searchQuery]);

  // Convert markdown-style bold to highlighted spans
  const renderHighlightedText = (text: string) => {
    if (!searchQuery.trim()) return text;

    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <mark key={index} className="bg-amber-200 text-stone-900 px-0.5 rounded">
            {part.slice(2, -2)}
          </mark>
        );
      }
      return part;
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'bg-green-100 text-green-700';
    if (confidence >= 0.5) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  return (
    <>
      {/* Extract Text Button */}
      <button
        type="button"
        onClick={handleExtractText}
        disabled={isExtracting}
        className="
          inline-flex items-center gap-2 px-4 py-2
          bg-stone-100 text-stone-700 font-medium rounded-lg
          hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
        "
        title="Extract text from PDF using OCR"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Extract Text
      </button>

      {/* Modal */}
      {showModal && (
        <div
          data-testid="modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleOverlayClick}
        >
          <div
            className="
              w-full max-w-3xl max-h-[90vh]
              bg-white rounded-2xl shadow-xl overflow-hidden
              flex flex-col
            "
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <div>
                <h3 className="text-lg font-serif font-medium text-stone-900">
                  Extracted Text - {pdfName}
                </h3>
                {totalPages > 0 && (
                  <p className="text-sm text-stone-500 mt-0.5">
                    {totalPages} page{totalPages !== 1 ? 's' : ''} processed
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Progress Bar */}
              {isExtracting && progress < 100 && (
                <div className="mb-6 space-y-2">
                  <div className="flex items-center justify-between text-sm text-stone-600">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Extracting...
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="w-full h-2 bg-stone-200 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div
                  role="alert"
                  className="mb-6 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Error: {error}</span>
                  </div>
                </div>
              )}

              {/* Results */}
              {!isExtracting && extractedPages.length > 0 && (
                <div className="space-y-4">
                  {/* Page Navigation */}
                  {extractedPages.length > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 bg-stone-50 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handlePageChange('prev')}
                        disabled={currentPageIndex === 0}
                        className="
                          px-3 py-1.5 text-sm font-medium text-stone-600
                          hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed
                          rounded-lg transition-colors
                        "
                      >
                        Previous
                      </button>
                      <span className="text-sm text-stone-600">
                        Page {currentPageIndex + 1} of {extractedPages.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePageChange('next')}
                        disabled={currentPageIndex === extractedPages.length - 1}
                        className="
                          px-3 py-1.5 text-sm font-medium text-stone-600
                          hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed
                          rounded-lg transition-colors
                        "
                      >
                        Next
                      </button>
                    </div>
                  )}

                  {/* Search */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg
                        className="h-5 w-5 text-stone-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search within text..."
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      className="
                        w-full pl-10 pr-4 py-2
                        bg-white border border-stone-200 rounded-lg
                        text-stone-900 placeholder:text-stone-400
                        focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500
                        transition-all duration-200
                      "
                    />
                    {searchQuery && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <span className="text-xs text-stone-500">
                          {matchCount} match{matchCount !== 1 ? 'es' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confidence Badge */}
                  {currentPage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-500">Page {currentPage.pageNumber}</span>
                      <div
                        className={`
                          inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                          ${getConfidenceColor(currentPage.confidence)}
                        `}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {Math.round(currentPage.confidence * 100)}% confidence
                      </div>
                    </div>
                  )}

                  {/* Text Display */}
                  <div
                    data-testid="extracted-text-textarea"
                    className="
                      w-full min-h-[200px] max-h-[400px] px-4 py-3
                      bg-stone-50 border border-stone-200 rounded-lg
                      text-stone-900 whitespace-pre-wrap overflow-auto
                      font-mono text-sm leading-relaxed
                    "
                  >
                    {renderHighlightedText(highlightedText)}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="
                        inline-flex items-center gap-2 px-4 py-2
                        bg-stone-100 text-stone-700 font-medium rounded-lg
                        hover:bg-stone-200 transition-colors
                      "
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                        />
                      </svg>
                      Copy
                    </button>

                    {extractedPages.length > 1 && (
                      <button
                        type="button"
                        onClick={handleCopyAll}
                        className="
                          inline-flex items-center gap-2 px-4 py-2
                          bg-stone-100 text-stone-700 font-medium rounded-lg
                          hover:bg-stone-200 transition-colors
                        "
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                          />
                        </svg>
                        Copy All
                      </button>
                    )}

                    {onTextExtracted && (
                      <button
                        type="button"
                        onClick={handleSaveToNote}
                        className="
                          inline-flex items-center gap-2 px-4 py-2
                          bg-stone-900 text-stone-50 font-medium rounded-lg
                          hover:bg-stone-800 transition-colors
                        "
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Save to note
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="
                        inline-flex items-center gap-2 px-4 py-2
                        text-stone-600 font-medium
                        hover:text-stone-900 transition-colors
                      "
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PDFTextExtractor;
