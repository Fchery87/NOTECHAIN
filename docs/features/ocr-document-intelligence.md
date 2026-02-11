# OCR & Document Intelligence

## Overview

NoteChain's OCR (Optical Character Recognition) feature enables AI-powered text extraction from images and PDFs, transforming visual content into searchable, editable text. Built with privacy at its core, all processing happens locally on your device using Tesseract.js — your documents never leave your browser.

## Features

- **Image-to-Text**: Extract text from uploaded images (JPG, PNG)
- **PDF Text Extraction**: OCR processing on PDF documents page-by-page
- **Handwriting Recognition**: Convert handwritten notes to digital text
- **Searchable Documents**: Full-text search capabilities on extracted content
- **Multi-language Support**: Recognize text in 27+ languages
- **Confidence Scoring**: Quality indicators showing extraction accuracy
- **Privacy-First**: All processing happens locally in your browser

## How It Works

NoteChain uses **Tesseract.js**, a powerful OCR engine compiled to WebAssembly that runs entirely in your browser:

1. **Local Processing**: Images and PDFs are processed on-device using WebAssembly
2. **No External Services**: Zero data is sent to cloud OCR services
3. **Encrypted Storage**: Extracted text is encrypted with XSalsa20-Poly1305 before storage
4. **Complete Privacy**: Your documents remain yours alone

### Technical Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Image/PDF      │────▶│  Tesseract.js   │────▶│  Encrypted      │
│  Upload         │     │  (WebAssembly)  │     │  Storage        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   Browser Canvas          Local CPU             IndexedDB +
   Pre-processing          Processing             XSalsa20-Poly1305
```

## Usage

### Extracting Text from Images

1. Navigate to the **OCR** page from the sidebar
2. **Drag and drop** an image or click to browse and select
3. **Choose language** from the dropdown (default: English)
4. **Enable handwriting mode** if the image contains handwritten text
5. Wait for processing — a progress indicator will show status
6. **View extracted text** with confidence score displayed
7. **Copy to clipboard** or **save to a note** for future reference

**Supported image formats:**

- JPEG/JPG
- PNG
- WebP (browser dependent)

**Tips for best results:**

- Use high-resolution images (300 DPI+ recommended)
- Ensure good contrast between text and background
- Avoid skewed or rotated text when possible
- Crop images to contain only the text area

### Extracting Text from PDFs

1. Open a PDF in the **PDF Viewer**
2. Click the **"Extract Text"** button in the toolbar
3. Wait for **page-by-page processing** — each page is processed individually
4. **Navigate through pages** using the pagination controls
5. **Search within extracted text** using the search bar
6. **Copy individual pages** or **export all text** to a note

**PDF Processing Features:**

- Page-by-page extraction with progress tracking
- Thumbnail navigation for quick page selection
- Text search across all extracted pages
- Export options: single page, selected pages, or entire document

### Managing Extractions

The OCR page displays your **recent extractions**:

- **View history**: See all previous text extractions
- **Click to view**: Open any extraction to see full text
- **Delete**: Remove extractions when no longer needed
- **Search**: Find specific text across all extractions

## Privacy & Security

### Local Processing

All OCR processing happens entirely within your browser:

- ✅ Images never leave your device
- ✅ No internet connection required after initial load
- ✅ Processing occurs in a WebAssembly sandbox
- ✅ No data transmission to external OCR services

### Encryption

Extracted text is secured with industry-standard encryption:

- **Algorithm**: XSalsa20-Poly1305 (authenticated encryption)
- **Key derivation**: Argon2id for password hashing
- **Storage**: Encrypted in browser's IndexedDB
- **Backup**: Optional encrypted cloud backup (user-controlled)

### No Cloud Dependencies

NoteChain's OCR requires zero cloud services:

- ❌ No Google Vision API
- ❌ No AWS Textract
- ❌ No Azure Computer Vision
- ❌ No data exfiltration
- ✅ Complete data sovereignty

## Supported Languages

Tesseract.js supports 27+ languages:

### Most Common

| Language   | Code  |
| ---------- | ----- |
| English    | `eng` |
| Spanish    | `spa` |
| French     | `fra` |
| German     | `deu` |
| Italian    | `ita` |
| Portuguese | `por` |
| Dutch      | `nld` |
| Russian    | `rus` |

### Asian Languages

| Language              | Code      |
| --------------------- | --------- |
| Chinese (Simplified)  | `chi_sim` |
| Chinese (Traditional) | `chi_tra` |
| Japanese              | `jpn`     |
| Korean                | `kor`     |

### Other Supported

- Arabic (`ara`)
- Hindi (`hin`)
- Bengali (`ben`)
- Tamil (`tam`)
- Thai (`tha`)
- Vietnamese (`vie`)
- Polish (`pol`)
- Turkish (`tur`)
- Swedish (`swe`)
- And more...

**Note:** Language data is loaded on-demand to minimize initial bundle size. First use of a language may require a brief download.

## Accuracy & Confidence

### Accuracy Expectations

| Content Type                | Expected Accuracy | Notes                         |
| --------------------------- | ----------------- | ----------------------------- |
| Printed text (high quality) | 95-99%            | Clear, 300+ DPI scans         |
| Printed text (average)      | 85-95%            | Standard document scans       |
| Screenshots                 | 90-98%            | Digital text capture          |
| Handwriting (trained)       | 70-85%            | With handwriting mode enabled |
| Handwriting (untrained)     | 50-70%            | Variable results              |
| Low quality scans           | 60-80%            | Depends on image quality      |

### Confidence Scores

Each extraction includes a confidence score (0-100):

| Score  | Indicator | Meaning                                       |
| ------ | --------- | --------------------------------------------- |
| 90-100 | 🟢 High   | Excellent quality, review unlikely needed     |
| 70-89  | 🟡 Good   | Good quality, minor review recommended        |
| 50-69  | 🟠 Fair   | Fair quality, review recommended              |
| 0-49   | 🔴 Low    | Poor quality, manual correction likely needed |

### Quality Indicators

Visual indicators help assess extraction quality at a glance:

- **Green badge**: High confidence (>80%)
- **Amber badge**: Medium confidence (50-80%)
- **Red badge**: Low confidence (<50%)

## Browser Support

### Full Support

| Browser | Version | Notes                          |
| ------- | ------- | ------------------------------ |
| Chrome  | 80+     | Recommended — best performance |
| Edge    | 80+     | Full support                   |
| Firefox | 75+     | Full support                   |
| Safari  | 14+     | Full support                   |

### Requirements

- **WebAssembly**: Required for Tesseract.js runtime
- **Canvas API**: Required for image preprocessing
- **IndexedDB**: Required for local storage
- **JavaScript ES2018+**: Modern browser features

### Performance Notes

- **Chrome/Edge**: Typically 20-30% faster due to V8 optimizations
- **Safari**: Good performance, slightly slower on large PDFs
- **Firefox**: Good performance, competitive with Chrome
- **Mobile browsers**: Supported but slower; recommend for short documents only

## Future Enhancements

Planned improvements to the OCR system:

### Near Term

- **Real-time camera OCR**: Extract text directly from device camera
- **Batch processing**: Upload and process multiple files simultaneously
- **Auto-rotation**: Automatic detection and correction of rotated text
- **Region selection**: Select specific areas of images for extraction

### Long Term

- **Table extraction**: Recognize and preserve tabular structures
- **Formula recognition**: Extract mathematical equations (LaTeX output)
- **Layout preservation**: Maintain document formatting and structure
- **Auto language detection**: Automatically detect document language
- **Enhanced handwriting**: Improved models for cursive and script

## Troubleshooting

### Low Accuracy

**Problem**: Extracted text contains many errors

**Solutions**:

1. **Improve image quality**: Use higher resolution (300+ DPI)
2. **Check lighting**: Ensure good contrast between text and background
3. **Correct language**: Verify the correct language is selected
4. **Enable handwriting mode**: For handwritten content
5. **Crop images**: Remove unnecessary background
6. **Check orientation**: Ensure text is not rotated or skewed

### Processing Errors

**Problem**: OCR fails to process file

**Solutions**:

1. **Check file format**: Ensure JPG, PNG, or valid PDF
2. **Verify PDF integrity**: Try opening in another PDF viewer
3. **Reduce file size**: Very large files may cause memory issues
4. **Try re-uploading**: Temporary issue, retry the upload
5. **Check browser console**: Look for JavaScript errors
6. **Clear cache**: Clear browser cache and reload

### Performance Issues

**Problem**: Processing is very slow

**Solutions**:

1. **Be patient with large PDFs**: Each page processes individually
2. **Monitor progress**: Check the progress indicator
3. **Close other tabs**: Free up browser memory
4. **Use Chrome/Edge**: These browsers typically perform best
5. **Split large PDFs**: Process in smaller chunks
6. **Handwriting mode**: This is slower, only enable when needed

### Language Data Not Loading

**Problem**: Language pack fails to download

**Solutions**:

1. **Check internet connection**: Initial language download requires internet
2. **Retry**: Click retry on the error message
3. **Try different language**: Some language packs may be temporarily unavailable
4. **Clear browser cache**: Remove corrupted language data
5. **Check console**: Look for CORS or network errors

### Out of Memory

**Problem**: Browser crashes or shows out of memory error

**Solutions**:

1. **Process smaller files**: Split large documents
2. **Close other applications**: Free up system RAM
3. **Use desktop browser**: Mobile browsers have stricter memory limits
4. **Process fewer pages**: Extract text from fewer pages at once
5. **Restart browser**: Clear accumulated memory usage

## Best Practices

### For Best OCR Results

1. **Scan at 300+ DPI** when possible
2. **Use black text on white background** for best contrast
3. **Avoid shadows and glare** on documents
4. **Keep text straight** — auto-rotation coming soon
5. **Crop to text area** — remove unnecessary margins
6. **Select correct language** — improves accuracy significantly
7. **Use handwriting mode** — when dealing with handwritten notes

### For Privacy

1. **Process sensitive documents offline** — disconnect internet if desired
2. **Regular backups** — export encrypted backups periodically
3. **Delete when done** — remove extractions you no longer need
4. **Use strong password** — protect your encryption key

### For Efficiency

1. **Batch similar documents** — same settings, faster workflow
2. **Use keyboard shortcuts** — navigate faster
3. **Save to notes** — integrate with your NoteChain workflow
4. **Tag extractions** — organize with metadata

---

_Your documents. Your device. Your privacy._
