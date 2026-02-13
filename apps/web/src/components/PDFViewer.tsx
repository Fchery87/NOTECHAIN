'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { PDFDocument, PDFAnnotation } from '@notechain/data-models';
import { PDFTextExtractor } from './PDFTextExtractor';

/**
 * Props for PDFViewer component
 */
export interface PDFViewerProps {
  pdf: PDFDocument;
  pdfBlob?: Blob;
  onAddAnnotation?: (
    annotation: Omit<PDFAnnotation, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>
  ) => void;
  onUpdateAnnotation?: (annotationId: string, updates: Partial<PDFAnnotation>) => void;
  onDeleteAnnotation?: (annotationId: string) => void;
  onAddSignature?: (signature: {
    signatureData: string;
    position: { x: number; y: number; pageNumber: number };
  }) => void;
  onTextExtracted?: (text: string, pageNumber?: number) => void;
  readOnly?: boolean;
}

/**
 * Annotation type options
 */
const annotationTypes: Array<{
  value: PDFAnnotation['type'];
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'highlight',
    label: 'Highlight',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3 3L22 4" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12.79A9 9 0 1111.21 12.79l-7-7A9 9 0 013-3.21-12.79z"
        />
      </svg>
    ),
  },
  {
    value: 'underline',
    label: 'Underline',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 4v7a5 5 0 0010 0v4M5 20h14"
        />
      </svg>
    ),
  },
  {
    value: 'note',
    label: 'Note',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-7"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.5 16.5l4-4" />
      </svg>
    ),
  },
  {
    value: 'drawing',
    label: 'Drawing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036a2.5 2.5 0 01-3.536-3.536l3.536-3.536a2.5 2.5 0 013.536-3.536z"
        />
      </svg>
    ),
  },
];

/**
 * Annotation color options
 */
const annotationColors = [
  { name: 'Yellow', value: '#fef08a' },
  { name: 'Green', value: '#a7f3d0' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Pink', value: '#f472b6' },
];

/**
 * PDFViewer component - Displays PDF with annotation tools
 * FR-PDF-02: Basic annotation (highlight, underline, freehand)
 */
export function PDFViewer({
  pdf,
  pdfBlob,
  onAddAnnotation,
  onUpdateAnnotation: _onUpdateAnnotation,
  onDeleteAnnotation: _onDeleteAnnotation,
  onAddSignature,
  onTextExtracted,
  readOnly = false,
}: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAnnotationType, setSelectedAnnotationType] = useState<
    PDFAnnotation['type'] | null
  >(null);
  const [selectedColor, setSelectedColor] = useState(annotationColors[0].value);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [_showTextExtractor, setShowTextExtractor] = useState(false);

  // Handle page navigation
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pdf.pageCount) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, pdf.pageCount]);

  // Handle annotation selection
  const handleSelectAnnotationType = useCallback(
    (type: PDFAnnotation['type']) => {
      setSelectedAnnotationType(type === selectedAnnotationType ? null : type);
      setIsDrawing(false);
      setDrawingPoints([]);
    },
    [selectedAnnotationType]
  );

  // Handle color selection
  const handleSelectColor = useCallback((color: string) => {
    setSelectedColor(color);
  }, []);

  // Handle canvas interactions for drawing
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!selectedAnnotationType || selectedAnnotationType !== 'drawing' || readOnly) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsDrawing(true);
      setDrawingPoints([{ x, y }]);
    },
    [selectedAnnotationType, readOnly]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setDrawingPoints(prev => [...prev, { x, y }]);
    },
    [isDrawing]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (!isDrawing || !selectedAnnotationType || !onAddAnnotation) return;

    setIsDrawing(false);

    if (drawingPoints.length > 2) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const _rect = canvas.getBoundingClientRect();
      const minX = Math.min(...drawingPoints.map(p => p.x));
      const maxX = Math.max(...drawingPoints.map(p => p.x));
      const minY = Math.min(...drawingPoints.map(p => p.y));
      const maxY = Math.max(...drawingPoints.map(p => p.y));

      onAddAnnotation({
        pdfId: pdf.id,
        type: 'drawing',
        content: JSON.stringify(drawingPoints),
        coordinates: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          pageNumber: currentPage,
        },
      });
    }

    setDrawingPoints([]);
  }, [isDrawing, drawingPoints, selectedAnnotationType, currentPage, onAddAnnotation]);

  // Handle text selection for highlight/underline
  const handleTextSelection = useCallback(() => {
    if (
      !selectedAnnotationType ||
      selectedAnnotationType === 'drawing' ||
      !onAddAnnotation ||
      readOnly
    )
      return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!range) return;

    const rect = range.getBoundingClientRect();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const x = rect.left - canvasRect.left;
    const y = rect.top - canvasRect.top;

    onAddAnnotation({
      pdfId: pdf.id,
      type: selectedAnnotationType,
      content: range.toString(),
      coordinates: {
        x,
        y,
        width: rect.width,
        height: rect.height,
        pageNumber: currentPage,
      },
    });

    selection.removeAllRanges();
    setSelectedAnnotationType(null);
  }, [selectedAnnotationType, currentPage, onAddAnnotation, readOnly]);

  // Handle signature addition
  const handleAddSignature = useCallback(
    (signatureData: string) => {
      if (!onAddSignature) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = rect.width / 2 - 50;
      const y = rect.height - 100;

      onAddSignature({
        signatureData,
        position: { x, y, pageNumber: currentPage },
      });

      setShowSignatureModal(false);
    },
    [onAddSignature]
  );

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDrawingPoints([]);
  }, []);

  // Draw existing annotations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw annotations
    pdf.annotations.forEach(ann => {
      if (ann.isDeleted) return;

      ctx.fillStyle = selectedColor;
      ctx.strokeStyle = selectedColor;

      if (ann.type === 'highlight') {
        ctx.globalAlpha = 0.3;
        ctx.fillRect(
          ann.coordinates.x,
          ann.coordinates.y,
          ann.coordinates.width,
          ann.coordinates.height
        );
        ctx.globalAlpha = 1;
      } else if (ann.type === 'underline') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ann.coordinates.x, ann.coordinates.y + ann.coordinates.height);
        ctx.lineTo(
          ann.coordinates.x + ann.coordinates.width,
          ann.coordinates.y + ann.coordinates.height
        );
        ctx.stroke();
      } else if (ann.type === 'drawing') {
        const points = JSON.parse(ann.content) as Array<{ x: number; y: number }>;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
    });

    // Draw current drawing
    if (isDrawing && drawingPoints.length > 0) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      drawingPoints.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }
  }, [pdf.annotations, selectedColor, isDrawing, drawingPoints]);

  return (
    <div className="flex flex-col h-full bg-stone-50">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200">
          <div className="flex items-center gap-2">
            {/* Annotation types */}
            {annotationTypes.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleSelectAnnotationType(type.value)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg
                  transition-all duration-200
                  ${
                    selectedAnnotationType === type.value
                      ? 'bg-stone-900 text-stone-50'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }
                `}
                title={type.label}
              >
                {type.icon}
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            ))}

            {/* Color picker */}
            {selectedAnnotationType && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-stone-200">
                {annotationColors.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleSelectColor(color.value)}
                    className={`
                      w-6 h-6 rounded-full border-2
                      transition-all duration-200
                      ${
                        selectedColor === color.value
                          ? 'border-stone-900 scale-110'
                          : 'border-stone-300 hover:border-stone-400'
                      }
                    `}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Clear button */}
            <button
              type="button"
              onClick={clearCanvas}
              className="px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              title="Clear annotations"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6l4 6"
                />
              </svg>
            </button>

            {/* Signature button */}
            {onAddSignature && (
              <button
                type="button"
                onClick={() => setShowSignatureModal(true)}
                className="px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                title="Add signature"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036a2.5 2.5 0 01-3.536-3.536l3.536-3.536a2.5 2.5 0 013.536-3.536z"
                  />
                </svg>
              </button>
            )}

            {/* Extract Text button */}
            {pdfBlob && (
              <PDFTextExtractor
                pdfBlob={pdfBlob}
                pdfName={pdf.title}
                onTextExtracted={onTextExtracted}
                onClose={() => setShowTextExtractor(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* PDF content area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div className="relative bg-white shadow-xl">
          {/* PDF placeholder - in production, use react-pdf or similar */}
          <div className="w-[600px] h-[800px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
              <h3 className="font-serif font-medium text-stone-900">{pdf.title}</h3>
              <span className="text-sm text-stone-500">
                Page {currentPage} of {pdf.pageCount}
              </span>
            </div>

            {/* Canvas for annotations */}
            <div className="relative flex-1 bg-stone-50">
              <canvas
                ref={canvasRef}
                width={600}
                height={800}
                className="absolute inset-0 cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onDoubleClick={handleTextSelection}
              />

              {/* Page content placeholder */}
              <div className="absolute inset-0 flex items-center justify-center text-stone-400">
                <div className="text-center">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-stone-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 21h10a2 2 0 002-2V9a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 9h6m-6 6h6"
                    />
                  </svg>
                  <p className="text-sm">PDF content would render here</p>
                  <p className="text-xs text-stone-400 mt-1">
                    {pdf.pageCount} pages • {(pdf.fileSize / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            </div>

            {/* Page navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage === pdf.pageCount}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Signature modal */}
      {showSignatureModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSignatureModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-serif font-medium text-stone-900 mb-4">Add Signature</h3>
            <p className="text-sm text-stone-500 mb-4">Draw your signature below</p>
            <div className="w-[400px] h-[200px] border-2 border-stone-300 rounded-lg mb-4 bg-stone-50">
              {/* Signature canvas would go here */}
              <div className="flex items-center justify-center h-full text-stone-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036a2.5 2.5 0 01-3.536-3.536l3.536-3.536a2.5 2.5 0 013.536-3.536z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  // In production, capture signature from canvas
                  handleAddSignature('signature-data-placeholder');
                }}
                className="px-4 py-2 bg-stone-900 text-stone-50 hover:bg-stone-800 rounded-lg transition-colors"
              >
                Add Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PDFViewer;
