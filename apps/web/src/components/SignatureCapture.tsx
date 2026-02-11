'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Props for SignatureCapture component
 */
export interface SignatureCaptureProps {
  onSave: (signature: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

/**
 * SignatureCapture component - Canvas-based signature capture
 * FR-PDF-03: Digital signature capture (Pro feature)
 */
export function SignatureCapture({
  onSave,
  onCancel,
  title = 'Sign Document',
  description = 'Draw your signature in the box below',
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Get canvas context
  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  // Get canvas coordinates
  const getCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Start drawing
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setIsDrawing(true);
      setIsEmpty(false);

      const coords = getCoordinates(e);

      const ctx = getCanvasContext();
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    },
    [getCanvasContext, getCoordinates]
  );

  // Draw
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const coords = getCoordinates(e);

      const ctx = getCanvasContext();
      if (!ctx) return;

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    },
    [isDrawing, getCanvasContext, getCoordinates]
  );

  // Stop drawing
  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.closePath();
  }, [isDrawing, getCanvasContext]);

  // Touch support
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setIsDrawing(true);
      setIsEmpty(false);

      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas || !touch) return;

      const rect = canvas.getBoundingClientRect();
      const coords = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };

      const ctx = getCanvasContext();
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    },
    [getCanvasContext]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      if (!canvas || !touch) return;

      const rect = canvas.getBoundingClientRect();
      const coords = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };

      const ctx = getCanvasContext();
      if (!ctx) return;

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    },
    [isDrawing, getCanvasContext]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.closePath();
  }, [isDrawing, getCanvasContext]);

  // Clear signature
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    setIsEmpty(true);
    setIsDrawing(false);
  }, [getCanvasContext]);

  // Save signature
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  }, [isEmpty, onSave]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !isEmpty) {
        handleSave();
      }
    },
    [isEmpty, onCancel, handleSave]
  );

  // Set up canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getCanvasContext();
    if (!ctx) return;

    // Set canvas size
    canvas.width = 600;
    canvas.height = 200;

    // Set white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [getCanvasContext]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signature-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 id="signature-title" className="text-lg font-serif font-medium text-stone-900">
            {title}
          </h2>
          <button
            onClick={onCancel}
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

        {/* Description */}
        {description && (
          <div className="px-6 py-4 bg-stone-50 border-b border-stone-200">
            <p className="text-sm text-stone-600 text-center">{description}</p>
          </div>
        )}

        {/* Canvas */}
        <div className="p-6">
          <div className="relative">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full border-2 border-stone-300 rounded-lg cursor-crosshair touch-none"
              aria-label="Signature canvas"
            />

            {/* Guide text */}
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-stone-400 text-sm">Sign here</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2.5 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            Clear
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isEmpty}
              className={`
                px-5 py-2.5 bg-stone-900 text-stone-50 font-medium rounded-lg
                transition-all duration-300 hover:shadow-lg hover:shadow-stone-900/20
                ${isEmpty ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stone-800'}
              `}
            >
              Save Signature
            </button>
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200">
          <p className="text-xs text-stone-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-stone-700">Esc</kbd> to
            cancel, <kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-stone-700">Enter</kbd>{' '}
            to save
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignatureCapture;
