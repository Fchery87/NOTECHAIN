import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';
import { ImageOCRUploader, ImageOCRUploaderProps } from '../ImageOCRUploader';

// Mock the OCR service
const mockExtractTextFromImage = jest.fn();

jest.mock('@/lib/ocr', () => ({
  extractTextFromImage: (...args: unknown[]) => mockExtractTextFromImage(...args),
}));

// Mock FileReader
global.FileReader = class FileReader {
  onload: ((event: { target: { result: string } }) => void) | null = null;
  readonly EMPTY = 0;
  readonly LOADING = 1;
  readonly DONE = 2;
  readyState = 0;
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;

  readAsDataURL() {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'data:image/png;base64,mock';
      if (this.onload) {
        this.onload({ target: { result: 'data:image/png;base64,mock' } });
      }
    }, 0);
  }

  readAsText() {}
  readAsArrayBuffer() {}
  readAsBinaryString() {}
  abort() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
} as unknown as typeof FileReader;

describe('ImageOCRUploader', () => {
  const defaultProps: ImageOCRUploaderProps = {
    onTextExtracted: jest.fn(),
    onSaveToNote: jest.fn(),
    className: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractTextFromImage.mockResolvedValue({
      text: 'Extracted text from image',
      confidence: 0.95,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('component renders with upload area', () => {
    render(<ImageOCRUploader {...defaultProps} />);

    expect(screen.getByText(/drag and drop an image here/i)).toBeInTheDocument();
    expect(screen.getByText(/click to select/i)).toBeInTheDocument();
  });

  test('drag and drop zone exists', () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const dropZone = screen.getByTestId('ocr-drop-zone');
    expect(dropZone).toBeInTheDocument();
  });

  test('file input fallback exists', () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  test('drag over changes visual state', () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const dropZone = screen.getByTestId('ocr-drop-zone');

    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('border-amber-500');
    expect(dropZone).toHaveClass('bg-amber-50');

    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass('border-amber-500');
  });

  test('drop file triggers processing', async () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const dropZone = screen.getByTestId('ocr-drop-zone');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(mockExtractTextFromImage).toHaveBeenCalledWith(file, expect.any(Object));
    });
  });

  test('file selection triggers processing', async () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockExtractTextFromImage).toHaveBeenCalledWith(file, expect.any(Object));
    });
  });

  test('shows progress during OCR', async () => {
    mockExtractTextFromImage.mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({ text: 'Test', confidence: 0.9 });
          }, 100);
        })
    );

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays extracted text when complete', async () => {
    const extractedText = 'This is the extracted text';
    mockExtractTextFromImage.mockResolvedValue({
      text: extractedText,
      confidence: 0.85,
    });

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const textarea = screen.getByTestId('ocr-textarea');
      expect(textarea).toHaveValue(extractedText);
    });
  });

  test('shows confidence score', async () => {
    mockExtractTextFromImage.mockResolvedValue({
      text: 'Test text',
      confidence: 0.92,
    });

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/92%/i)).toBeInTheDocument();
      expect(screen.getByText(/confidence/i)).toBeInTheDocument();
    });
  });

  test('confidence badge is green when > 80%', async () => {
    mockExtractTextFromImage.mockResolvedValue({
      text: 'Test',
      confidence: 0.92,
    });

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const badge = screen.getByTestId('confidence-badge');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-700');
    });
  });

  test('confidence badge is amber when 50-80%', async () => {
    mockExtractTextFromImage.mockResolvedValue({
      text: 'Test',
      confidence: 0.65,
    });

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const badge = screen.getByTestId('confidence-badge');
      expect(badge).toHaveClass('bg-amber-100');
      expect(badge).toHaveClass('text-amber-700');
    });
  });

  test('confidence badge is red when < 50%', async () => {
    mockExtractTextFromImage.mockResolvedValue({
      text: 'Test',
      confidence: 0.35,
    });

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const badge = screen.getByTestId('confidence-badge');
      expect(badge).toHaveClass('bg-rose-100');
      expect(badge).toHaveClass('text-rose-700');
    });
  });

  test('copy to clipboard button works', async () => {
    const extractedText = 'Text to copy';
    mockExtractTextFromImage.mockResolvedValue({
      text: extractedText,
      confidence: 0.95,
    });

    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('ocr-textarea')).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(extractedText);
    });
  });

  test('save to note button works', async () => {
    const extractedText = 'Text to save';
    mockExtractTextFromImage.mockResolvedValue({
      text: extractedText,
      confidence: 0.95,
    });

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('ocr-textarea')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save to note/i });
    fireEvent.click(saveButton);

    expect(defaultProps.onSaveToNote).toHaveBeenCalledWith(extractedText);
  });

  test('language selector exists', () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const languageSelect = screen.getByLabelText(/language/i);
    expect(languageSelect).toBeInTheDocument();
    expect(languageSelect).toHaveValue('eng');
  });

  test('handwriting mode toggle exists', () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const handwritingToggle = screen.getByRole('checkbox', { name: /handwriting/i });
    expect(handwritingToggle).toBeInTheDocument();
    expect(handwritingToggle).not.toBeChecked();
  });

  test('handwriting toggle changes state', () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const handwritingToggle = screen.getByRole('checkbox', { name: /handwriting/i });

    fireEvent.click(handwritingToggle);
    expect(handwritingToggle).toBeChecked();

    fireEvent.click(handwritingToggle);
    expect(handwritingToggle).not.toBeChecked();
  });

  test('error handling displays errors', async () => {
    mockExtractTextFromImage.mockRejectedValue(new Error('OCR failed'));

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('process another button clears state', async () => {
    mockExtractTextFromImage.mockResolvedValue({
      text: 'Test text',
      confidence: 0.9,
    });

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('ocr-textarea')).toBeInTheDocument();
    });

    const processAnotherButton = screen.getByRole('button', { name: /process another/i });
    fireEvent.click(processAnotherButton);

    await waitFor(() => {
      expect(screen.getByText(/drag and drop an image here/i)).toBeInTheDocument();
    });
  });

  test('onTextExtracted callback is called with text and file', async () => {
    const extractedText = 'Callback test';
    mockExtractTextFromImage.mockResolvedValue({
      text: extractedText,
      confidence: 0.95,
    });

    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(defaultProps.onTextExtracted).toHaveBeenCalledWith(extractedText, file);
    });
  });

  test('image preview is displayed when file is selected', async () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
    });
  });

  test('upload icon is displayed', () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const uploadIcon = screen.getByTestId('upload-icon');
    expect(uploadIcon).toBeInTheDocument();
    expect(uploadIcon.tagName.toLowerCase()).toBe('svg');
  });

  test('language change updates OCR options', async () => {
    render(<ImageOCRUploader {...defaultProps} />);

    const languageSelect = screen.getByLabelText(/language/i);
    fireEvent.change(languageSelect, { target: { value: 'fra' } });

    const fileInput = screen.getByTestId('ocr-file-input');
    const file = new File(['test'], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockExtractTextFromImage).toHaveBeenCalledWith(
        file,
        expect.objectContaining({ language: 'fra' })
      );
    });
  });
});
