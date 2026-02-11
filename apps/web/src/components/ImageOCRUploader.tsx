import React, { useState, useCallback, useRef } from 'react';
import { extractTextFromImage, OCRResult } from '@/lib/ocr';

interface OCROptions {
  language?: string;
  isHandwriting?: boolean;
  onProgress?: (progress: number) => void;
}

export interface ImageOCRUploaderProps {
  onTextExtracted?: (text: string, image: File) => void;
  onSaveToNote?: (text: string) => void;
  className?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'spa', name: 'Spanish' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'rus', name: 'Russian' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'chi_tra', name: 'Chinese (Traditional)' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hin', name: 'Hindi' },
];

export function ImageOCRUploader({
  onTextExtracted,
  onSaveToNote,
  className = '',
}: ImageOCRUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [language, setLanguage] = useState('eng');
  const [isHandwriting, setIsHandwriting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          processImage(file);
        }
      }
    },
    [language, isHandwriting]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          processImage(file);
        }
      }
    },
    [language, isHandwriting]
  );

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setSelectedImage(file);
    setExtractedText('');
    setConfidence(0);

    // Create image preview
    const reader = new FileReader();
    reader.onload = e => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const options: OCROptions = {
        language,
        isHandwriting,
      };

      const result: OCRResult = await extractTextFromImage(file, options);

      clearInterval(progressInterval);
      setProgress(100);
      setExtractedText(result.text);
      setConfidence(result.confidence);

      if (onTextExtracted) {
        onTextExtracted(result.text, file);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Failed to extract text from image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleSaveToNote = () => {
    if (onSaveToNote) {
      onSaveToNote(extractedText);
    }
  };

  const handleReset = () => {
    setIsDragging(false);
    setIsProcessing(false);
    setProgress(0);
    setExtractedText('');
    setConfidence(0);
    setError(null);
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf > 0.8) return 'bg-green-100 text-green-700';
    if (conf >= 0.5) return 'bg-amber-100 text-amber-700';
    return 'bg-rose-100 text-rose-700';
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Settings */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="ocr-language" className="text-sm font-medium text-stone-700">
            Language
          </label>
          <select
            id="ocr-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:opacity-50"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="ocr-handwriting" className="text-sm font-medium text-stone-700">
            Handwriting mode
          </label>
          <button
            id="ocr-handwriting"
            role="checkbox"
            aria-checked={isHandwriting}
            onClick={() => setIsHandwriting(!isHandwriting)}
            disabled={isProcessing}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              isHandwriting ? 'bg-amber-500' : 'bg-stone-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isHandwriting ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
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

      {/* Upload Area or Results */}
      {!extractedText && !isProcessing ? (
        <div
          data-testid="ocr-drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-amber-500 bg-amber-50'
              : 'border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100'
          }`}
        >
          <input
            ref={fileInputRef}
            data-testid="ocr-file-input"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Select image file"
          />

          <svg
            data-testid="upload-icon"
            className="mx-auto h-12 w-12 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <p className="mt-4 text-lg font-medium text-stone-700">
            Drag and drop an image here, or click to select
          </p>
          <p className="mt-2 text-sm text-stone-500">Supports PNG, JPG, GIF up to 10MB</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-stone-600">
                <span>Processing...</span>
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

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-64 object-contain rounded-lg border border-stone-200"
              />
            </div>
          )}

          {/* Extracted Text */}
          {extractedText && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-stone-700">Extracted Text</h3>
                <div
                  data-testid="confidence-badge"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getConfidenceColor(
                    confidence
                  )}`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {Math.round(confidence * 100)}% confidence
                </div>
              </div>

              <textarea
                data-testid="ocr-textarea"
                value={extractedText}
                onChange={e => setExtractedText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-lg text-stone-900 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 font-medium rounded-lg hover:bg-stone-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  Copy
                </button>

                {onSaveToNote && (
                  <button
                    onClick={handleSaveToNote}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-stone-50 font-medium rounded-lg hover:bg-stone-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-4 py-2 text-stone-600 font-medium hover:text-stone-900 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Process another
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
