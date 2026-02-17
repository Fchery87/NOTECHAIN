import { describe, it, expect, beforeEach, afterEach, vi, mock } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import OCRPage from './page';
import type { OCRResult } from '@/lib/storage/ocrStorage';

// Mock ImageOCRUploader component
const MockImageOCRUploader = ({
  onTextExtracted,
}: {
  onTextExtracted?: (text: string, image: File) => void;
}) => (
  <div data-testid="image-ocr-uploader">
    <span>Image OCR Uploader Component</span>
    <button
      data-testid="mock-extract-button"
      onClick={() => {
        const mockFile = new File(['mock'], 'test.png', { type: 'image/png' });
        onTextExtracted?.('Extracted text content', mockFile);
      }}
    >
      Mock Extract
    </button>
  </div>
);

mock.module('@/components/ImageOCRUploader', () => ({
  ImageOCRUploader: MockImageOCRUploader,
}));

// Mock OCRStorage
const mockGetRecentOCRResults = mock(() => Promise.resolve<OCRResult[]>([]));
const mockDeleteOCRResult = mock(() => Promise.resolve());

mock.module('@/lib/storage/ocrStorage', () => ({
  OCRStorage: class MockOCRStorage {
    getRecentOCRResults = mockGetRecentOCRResults;
    deleteOCRResult = mockDeleteOCRResult;
  },
}));

// Mock window.confirm
const mockConfirm = mock(() => true);
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: mockConfirm,
});

describe('OCRPage', () => {
  const mockResults: OCRResult[] = [
    {
      id: '1',
      documentId: 'doc-1',
      documentType: 'image',
      text: 'This is the extracted text from the first document. It contains some important information.',
      encryptedText: { ciphertext: new Uint8Array(), nonce: new Uint8Array() },
      confidence: 95,
      language: 'eng',
      wordCount: 15,
      createdAt: new Date('2024-01-15T10:00:00'),
      updatedAt: new Date('2024-01-15T10:00:00'),
    },
    {
      id: '2',
      documentId: 'doc-2',
      documentType: 'pdf',
      pageNumber: 1,
      text: 'PDF document text extraction result with multiple words for testing purposes.',
      encryptedText: { ciphertext: new Uint8Array(), nonce: new Uint8Array() },
      confidence: 87,
      language: 'eng',
      wordCount: 12,
      createdAt: new Date('2024-01-14T14:30:00'),
      updatedAt: new Date('2024-01-14T14:30:00'),
    },
  ];

  beforeEach(() => {
    mockGetRecentOCRResults.mockClear();
    mockDeleteOCRResult.mockClear();
    mockConfirm.mockClear();
    mockGetRecentOCRResults.mockImplementation(() => Promise.resolve(mockResults));
  });

  afterEach(() => {
    mockGetRecentOCRResults.mockClear();
    mockDeleteOCRResult.mockClear();
    mockConfirm.mockClear();
  });

  test('renders with title "OCR & Document Intelligence"', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    expect(screen.getByText('OCR & Document Intelligence')).toBeInTheDocument();
  });

  test('shows description text', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    expect(screen.getByText(/Extract text from images and PDFs using AI/)).toBeInTheDocument();
  });

  test('shows ImageOCRUploader component', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    expect(screen.getByTestId('image-ocr-uploader')).toBeInTheDocument();
  });

  test('shows "Recent Extractions" section', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    expect(screen.getByText('Recent Extractions')).toBeInTheDocument();
  });

  test('displays recent OCR results', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('15 words')).toBeInTheDocument();
      expect(screen.getByText('12 words')).toBeInTheDocument();
    });
  });

  test('handles empty state when no extractions', async () => {
    mockGetRecentOCRResults.mockImplementation(() => Promise.resolve([]));

    await act(async () => {
      render(<OCRPage />);
    });

    await waitFor(() => {
      expect(screen.getByText(/No recent extractions/)).toBeInTheDocument();
    });
  });

  test('clicking recent extraction opens detail view', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('View')[0]).toBeInTheDocument();
    });

    const viewButton = screen.getAllByText('View')[0];

    await act(async () => {
      fireEvent.click(viewButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('ocr-detail-modal')).toBeInTheDocument();
    });
  });

  test('delete button removes extraction', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByLabelText('Delete extraction')[0]).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByLabelText('Delete extraction')[0];

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(mockConfirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockDeleteOCRResult).toHaveBeenCalled();
    });
  });

  test('shows document type icons', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    await waitFor(() => {
      expect(screen.getByTestId('doc-type-image')).toBeInTheDocument();
      expect(screen.getByTestId('doc-type-pdf')).toBeInTheDocument();
    });
  });

  test('displays confidence scores', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('95% confidence')).toBeInTheDocument();
      expect(screen.getByText('87% confidence')).toBeInTheDocument();
    });
  });

  test('modal closes when clicking close button', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('View')[0]).toBeInTheDocument();
    });

    const viewButton = screen.getAllByText('View')[0];

    await act(async () => {
      fireEvent.click(viewButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('ocr-detail-modal')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');

    await act(async () => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('ocr-detail-modal')).not.toBeInTheDocument();
    });
  });

  test('page has correct layout structure', async () => {
    await act(async () => {
      render(<OCRPage />);
    });

    expect(screen.getByTestId('ocr-page')).toBeInTheDocument();
    expect(screen.getByTestId('ocr-header')).toBeInTheDocument();
  });
});
