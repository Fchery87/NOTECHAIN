import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';
import { PDFTextExtractor, PDFTextExtractorProps } from '../PDFTextExtractor';

// Mock the OCR service
const mockInitialize = jest.fn().mockResolvedValue(undefined);
const mockExtractTextFromPDF = jest.fn();
const mockTerminate = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/ocr', () => ({
  OCRService: jest.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    extractTextFromPDF: mockExtractTextFromPDF,
    terminate: mockTerminate,
  })),
}));

describe('PDFTextExtractor', () => {
  const createMockBlob = (content: string = 'mock pdf content'): Blob => {
    return new Blob([content], { type: 'application/pdf' });
  };

  const defaultProps: PDFTextExtractorProps = {
    pdfBlob: createMockBlob(),
    pdfName: 'test-document.pdf',
    onTextExtracted: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractTextFromPDF.mockResolvedValue({
      text: 'Extracted text from PDF page 1',
      confidence: 0.95,
      pageCount: 3,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('component renders with Extract Text button', () => {
    render(<PDFTextExtractor {...defaultProps} />);

    expect(screen.getByRole('button', { name: /extract text/i })).toBeInTheDocument();
  });

  test('clicking button starts extraction', async () => {
    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(mockExtractTextFromPDF).toHaveBeenCalledWith(defaultProps.pdfBlob);
    });
  });

  test('shows progress during extraction', async () => {
    mockExtractTextFromPDF.mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              text: 'Page 1 text\n\nPage 2 text',
              confidence: 0.9,
              pageCount: 2,
            });
          }, 100);
        })
    );

    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByText(/extracting/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays extracted text modal when complete', async () => {
    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByText(/extracted text/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/test-document.pdf/i)).toBeInTheDocument();
  });

  test('shows page navigation for multi-page PDFs', async () => {
    mockExtractTextFromPDF.mockResolvedValue({
      text: 'Page 1 text\n\nPage 2 text\n\nPage 3 text',
      confidence: 0.9,
      pageCount: 3,
    });

    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  test('page navigation works correctly', async () => {
    mockExtractTextFromPDF.mockResolvedValue({
      text: 'Page 1 text\n\nPage 2 text\n\nPage 3 text',
      confidence: 0.9,
      pageCount: 3,
    });

    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();

    const prevButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(prevButton);

    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
  });

  test('search within text works', async () => {
    mockExtractTextFromPDF.mockResolvedValue({
      text: 'First page content\n\nSecond page with search term\n\nThird page',
      confidence: 0.9,
      pageCount: 3,
    });

    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'search term' } });

    await waitFor(() => {
      expect(screen.getByText(/1 match/i)).toBeInTheDocument();
    });
  });

  test('copy text button works', async () => {
    const extractedText = 'Text to copy from PDF';
    mockExtractTextFromPDF.mockResolvedValue({
      text: extractedText,
      confidence: 0.95,
      pageCount: 1,
    });

    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: /copy$/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(extractedText);
    });
  });

  test('copy all button works', async () => {
    mockExtractTextFromPDF.mockResolvedValue({
      text: 'Page 1\n\nPage 2\n\nPage 3',
      confidence: 0.9,
      pageCount: 3,
    });

    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy all/i })).toBeInTheDocument();
    });

    const copyAllButton = screen.getByRole('button', { name: /copy all/i });
    fireEvent.click(copyAllButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('Page 1\n\nPage 2\n\nPage 3');
    });
  });

  test('save to note button works', async () => {
    const onTextExtracted = jest.fn();
    mockExtractTextFromPDF.mockResolvedValue({
      text: 'Text to save',
      confidence: 0.95,
      pageCount: 1,
    });

    render(<PDFTextExtractor {...defaultProps} onTextExtracted={onTextExtracted} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save to note/i })).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save to note/i });
    fireEvent.click(saveButton);

    expect(onTextExtracted).toHaveBeenCalledWith('Text to save', 1);
  });

  test('handles errors gracefully', async () => {
    mockExtractTextFromPDF.mockRejectedValue(new Error('OCR failed'));

    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('close modal works', async () => {
    const onClose = jest.fn();

    render(<PDFTextExtractor {...defaultProps} onClose={onClose} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByTestId('extracted-text-textarea')).toBeInTheDocument();
    });

    const closeButton = screen
      .getAllByRole('button', { name: /close/i })
      .find(btn => btn.textContent?.toLowerCase().includes('close'));
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    expect(onClose).toHaveBeenCalled();
  });

  test('confidence badge is displayed', async () => {
    mockExtractTextFromPDF.mockResolvedValue({
      text: 'Extracted text',
      confidence: 0.92,
      pageCount: 1,
    });

    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByText(/92%/i)).toBeInTheDocument();
      expect(screen.getByText(/confidence/i)).toBeInTheDocument();
    });
  });

  test('modal closes when clicking outside', async () => {
    const onClose = jest.fn();

    render(<PDFTextExtractor {...defaultProps} onClose={onClose} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByText(/extracted text/i)).toBeInTheDocument();
    });

    const modalOverlay = screen.getByTestId('modal-overlay');
    fireEvent.click(modalOverlay);

    expect(onClose).toHaveBeenCalled();
  });

  test('search highlights matching text', async () => {
    mockExtractTextFromPDF.mockResolvedValue({
      text: 'Hello world test content',
      confidence: 0.9,
      pageCount: 1,
    });

    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'world' } });

    await waitFor(() => {
      expect(screen.getByText(/1 match/i)).toBeInTheDocument();
    });
  });

  test('text display exists', async () => {
    mockExtractTextFromPDF.mockResolvedValue({
      text: 'Read only text',
      confidence: 0.9,
      pageCount: 1,
    });

    render(<PDFTextExtractor {...defaultProps} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      const textDisplay = screen.getByTestId('extracted-text-textarea');
      expect(textDisplay).toBeInTheDocument();
      expect(textDisplay.textContent).toBe('Read only text');
    });
  });

  test('onTextExtracted callback is called with text and page number', async () => {
    const onTextExtracted = jest.fn();
    mockExtractTextFromPDF.mockResolvedValue({
      text: 'Callback test text',
      confidence: 0.95,
      pageCount: 1,
    });

    render(<PDFTextExtractor {...defaultProps} onTextExtracted={onTextExtracted} />);

    const extractButton = screen.getByRole('button', { name: /extract text/i });
    fireEvent.click(extractButton);

    await waitFor(() => {
      expect(onTextExtracted).toHaveBeenCalledWith('Callback test text', 1);
    });
  });
});
