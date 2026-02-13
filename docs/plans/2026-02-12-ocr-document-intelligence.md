# OCR & Document Intelligence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add OCR (Optical Character Recognition) capabilities for extracting text from PDFs, images, and handwritten notes using Tesseract.js, making documents searchable and enabling document workflows.

**Architecture:** Create an OCRService that uses Tesseract.js (WebAssembly) to process images and PDFs locally. Integrate with the existing PDF viewer to extract text from pages, and create components for uploading and processing images. Store OCR results encrypted alongside documents.

**Tech Stack:** React, TypeScript, Tesseract.js (Apache 2.0), PDF-lib (for PDF processing), existing encryption layer (XSalsa20-Poly1305), IndexedDB

**Test Framework:** Vitest + React Testing Library + Tesseract mocking

**Cost:** $0 (Tesseract.js is free and open-source, runs locally)

---

## Prerequisites

Before starting, verify the existing infrastructure:

**Step 0.1: Check PDF viewer infrastructure**

Run: `ls -la apps/web/src/components/PDFViewer.tsx`
Expected: File exists

**Step 0.2: Check existing storage**

Run: `ls -la apps/web/src/lib/storage/`
Expected: Storage utilities exist

**Step 0.3: Verify tests pass**

Run: `bun test` from project root

---

## Task 1: Install Tesseract.js Dependencies

**Files:**

- Modify: `apps/web/package.json`

**Step 1.1: Install Tesseract.js**

```bash
cd apps/web
bun add tesseract.js
```

**Step 1.2: Install PDF processing library**

```bash
bun add pdf-lib
```

**Step 1.3: Verify installation**

Run: `bun run build`
Expected: Build succeeds

**Step 1.4: Commit**

```bash
git add apps/web/package.json bun.lockb
git commit -m "deps: install tesseract.js and pdf-lib for OCR

- Install tesseract.js for local OCR processing
- Install pdf-lib for PDF manipulation
- Enables text extraction from images and PDFs locally"
```

---

## Task 2: Create OCR Service

**Files:**

- Create: `apps/web/src/lib/ocr/ocrService.ts`
- Test: `apps/web/src/lib/ocr/__tests__/ocrService.test.ts`

**Step 2.1: Create directory**

```bash
mkdir -p apps/web/src/lib/ocr/__tests__
```

**Step 2.2: Write the failing test**

Create test covering:

- OCRService initialization
- Extract text from image (mock Tesseract)
- Extract text from PDF page
- Handwriting recognition mode
- Progress callback handling
- Error handling for invalid images
- Language selection
- Confidence scoring

**Step 2.3: Run test to verify it fails**

**Step 2.4: Write implementation**

Create `ocrService.ts` with:

- OCRService class
- initialize() - loads Tesseract worker
- extractTextFromImage(image: File | Blob, options) - uses Tesseract.js
- extractTextFromPDF(pdfBlob: Blob, pageNumber?: number) - renders PDF to image, then OCR
- recognizeHandwriting(image: File | Blob) - uses handwriting-trained model
- Support languages: 'eng' (default), 'spa', 'fra', 'deu', etc.
- Confidence threshold filtering
- Progress callbacks

Tesseract.js usage:

- Worker-based API for performance
- createWorker('eng') for English
- Recognize method returns text and confidence

**Step 2.5: Run test to verify it passes**

**Step 2.6: Commit**

```bash
git add apps/web/src/lib/ocr/
git commit -m "feat(ocr): add OCR service with Tesseract.js

- Create OCRService for text extraction from images and PDFs
- Support multiple languages
- Include handwriting recognition mode
- Add progress callbacks and confidence scoring
- Add comprehensive test coverage"
```

---

## Task 3: Create OCR Result Storage

**Files:**

- Create: `apps/web/src/lib/storage/ocrStorage.ts`
- Test: `apps/web/src/lib/storage/__tests__/ocrStorage.test.ts`

**Step 3.1: Write the failing test**

Create test for:

- Save OCR result for document
- Get OCR result by document ID
- Get OCR result by page number
- Update OCR result
- Delete OCR result
- Full-text search on OCR text
- Handle multiple pages

**Step 3.2: Run test to verify it fails**

**Step 3.3: Write implementation**

Create `ocrStorage.ts` with:

- OCRResult interface:
  - id: string
  - documentId: string (links to PDF or image)
  - documentType: 'pdf' | 'image'
  - pageNumber?: number (for PDFs)
  - text: string (extracted text)
  - confidence: number (average confidence)
  - language: string
  - wordCount: number
  - createdAt: Date
  - updatedAt: Date

- OCRStorage class:
  - Uses IndexedDB
  - saveOCRResult(result) - encrypts and stores
  - getOCRResult(documentId, pageNumber?) - decrypts and returns
  - getAllOCRResultsForDocument(documentId) - all pages
  - deleteOCRResult(id)
  - searchOCRText(query) - full-text search across all OCR results
  - Integrate with existing crypto layer

**Step 3.4: Run test to verify it passes**

**Step 3.5: Commit**

```bash
git add apps/web/src/lib/storage/
git commit -m "feat(ocr): add OCR result storage

- Create OCRResult interface for storing extracted text
- Store encrypted OCR results in IndexedDB
- Support multi-page PDFs
- Add full-text search across OCR data
- Integrate with existing crypto layer"
```

---

## Task 4: Create Image Upload & OCR Component

**Files:**

- Create: `apps/web/src/components/ImageOCRUploader.tsx`
- Test: `apps/web/src/components/__tests__/ImageOCRUploader.test.tsx`

**Step 4.1: Write the failing test**

Create test for:

- Component renders with upload area
- Drag and drop image works
- File selection works
- Shows progress during OCR
- Displays extracted text
- Shows confidence score
- Copy to clipboard works
- Save to notes works
- Error handling for invalid files

**Step 4.2: Run test to verify it fails**

**Step 4.3: Write implementation**

Create `ImageOCRUploader.tsx` with:

- Props interface:
  - onTextExtracted?: (text: string, image: File) => void
  - onSaveToNote?: (text: string) => void
  - className?: string

- State:
  - isDragging: boolean
  - isProcessing: boolean
  - progress: number
  - extractedText: string
  - confidence: number
  - error: string | null
  - selectedImage: File | null

- Features:
  - Drag and drop zone with visual feedback
  - File input fallback
  - Image preview
  - Progress bar during OCR
  - Extracted text display (textarea)
  - Confidence score badge
  - Copy to clipboard button
  - Save to note button
  - Language selector (dropdown)
  - Handwriting mode toggle

- Follow Warm Editorial Minimalism design

**Step 4.4: Run test to verify it passes**

**Step 4.5: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(ocr): add ImageOCRUploader component

- Drag and drop image upload
- Real-time OCR with progress indicator
- Display extracted text with confidence score
- Copy to clipboard and save to note functionality
- Support language selection and handwriting mode
- Follow Warm Editorial Minimalism design"
```

---

## Task 5: Integrate OCR with PDF Viewer

**Files:**

- Modify: `apps/web/src/components/PDFViewer.tsx`
- Create: `apps/web/src/components/PDFTextExtractor.tsx`
- Test: `apps/web/src/components/__tests__/PDFTextExtractor.test.tsx`

**Step 5.1: Write the failing test**

Create test for PDFTextExtractor:

- Shows "Extract Text" button
- Shows progress during extraction
- Displays extracted text modal
- Handles multi-page PDFs
- Shows confidence scores per page
- Search within extracted text
- Copy text to clipboard
- Save to note

**Step 5.2: Run test to verify it fails**

**Step 5.3: Write implementation**

Create `PDFTextExtractor.tsx`:

- Props:
  - pdfBlob: Blob
  - pdfName: string
  - onTextExtracted?: (text: string, pageNumber?: number) => void

- State:
  - isExtracting: boolean
  - progress: number
  - extractedPages: Array<{pageNumber: number, text: string, confidence: number}>
  - currentPage: number
  - showModal: boolean
  - searchQuery: string

- Features:
  - "Extract Text" button in PDF viewer toolbar
  - Progress bar (page X of Y)
  - Modal showing extracted text
  - Page navigation (prev/next)
  - Search within text
  - Highlight search results
  - Copy page text
  - Copy all text
  - Save to note
  - Confidence indicator per page

**Step 5.4: Modify PDFViewer.tsx**

- Import PDFTextExtractor
- Add "Extract Text" button to toolbar
- Pass PDF blob to extractor
- Handle extracted text (optional callback)

**Step 5.5: Run tests to verify they pass**

**Step 5.6: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat(ocr): integrate OCR with PDF viewer

- Add PDFTextExtractor component for extracting text from PDFs
- Integrate with existing PDFViewer component
- Support multi-page PDF processing
- Add search within extracted text
- Allow copying and saving extracted text
- Add comprehensive test coverage"
```

---

## Task 6: Create OCR Page

**Files:**

- Create: `apps/web/src/app/ocr/page.tsx`
- Test: `apps/web/src/app/ocr/page.test.tsx`

**Step 6.1: Create directory**

```bash
mkdir -p apps/web/src/app/ocr
```

**Step 6.2: Write the failing test**

Create test for:

- Page renders with title
- Shows ImageOCRUploader component
- Shows recent OCR results
- Handles empty state

**Step 6.3: Run test to verify it fails**

**Step 6.4: Write implementation**

Create `apps/web/src/app/ocr/page.tsx`:

- Client component
- Header with title "OCR & Document Intelligence"
- Description text explaining features
- ImageOCRUploader component
- "Recent Extractions" section showing last 5 OCR results
- Click on recent extraction to view full text
- Delete recent extraction
- Empty state when no extractions
- Follow Warm Editorial Minimalism design

**Step 6.5: Run test to verify it passes**

**Step 6.6: Commit**

```bash
git add apps/web/src/app/ocr/
git commit -m "feat(ocr): add OCR page

- Create /ocr route for document intelligence
- Display ImageOCRUploader component
- Show recent OCR extractions
- Support viewing and deleting past extractions
- Add page layout with header and description"
```

---

## Task 7: Add Navigation Link

**Files:**

- Modify: `apps/web/src/app/components/Navigation.tsx`

**Step 7.1: Add link**

Add "OCR" link to navigation:

- Label: "OCR"
- Href: "/ocr"
- Icon: Document/text recognition icon
- Position: After "Meetings" or alongside other features

**Step 7.2: Commit**

```bash
git add apps/web/src/app/components/Navigation.tsx
git commit -m "feat(ocr): add OCR navigation link

- Add link to /ocr page in main navigation
- Use document/text recognition icon"
```

---

## Task 8: Create Documentation

**Files:**

- Create: `docs/features/ocr-document-intelligence.md`

**Step 8.1: Create documentation**

Create comprehensive docs covering:

- Overview of OCR capabilities
- How to extract text from images
- How to extract text from PDFs
- Handwriting recognition
- Searchable annotations
- Privacy (local processing)
- Language support
- Accuracy and confidence scores
- Browser support
- Future enhancements

**Step 8.2: Commit**

```bash
git add docs/features/ocr-document-intelligence.md
git commit -m "docs(ocr): add OCR documentation

- Document OCR features and capabilities
- Explain usage for images and PDFs
- Detail privacy benefits (local processing)
- List supported languages
- Add accuracy and confidence information"
```

---

## Summary

**Total Tasks:** 8
**Estimated Time:** 2 weeks
**Cost:** $0 (Tesseract.js is free and open-source)

**What Was Built:**

1. ✅ Tesseract.js installation
2. ✅ OCR service for images and PDFs
3. ✅ OCR result storage (encrypted)
4. ✅ Image upload and OCR component
5. ✅ PDF text extraction integration
6. ✅ OCR page (/ocr route)
7. ✅ Navigation link
8. ✅ Documentation

**Key Features:**

- Local OCR processing (privacy-preserving)
- Image-to-text extraction
- PDF text extraction (multi-page)
- Handwriting recognition
- Searchable text
- Encrypted storage
- Confidence scoring

**Privacy Benefits:**

- Text extraction happens locally
- No images sent to cloud services
- Results encrypted at rest
- Zero data exfiltration

Ready for subagent-driven development!
