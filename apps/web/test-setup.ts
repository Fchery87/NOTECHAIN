/**
 * Test setup file for Vitest
 * Provides browser API mocks and test utilities
 */

import { vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';

// ============================================================================
// localStorage Mock
// ============================================================================

const createStorageMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
};

// ============================================================================
// Web Audio API Mock
// ============================================================================

const createAudioContextMock = () => {
  return class AudioContext {
    state = 'running';
    sampleRate = 44100;
    currentTime = 0;

    createMediaStreamSource() {
      return {
        connect: () => {},
        disconnect: () => {},
        mediaStream: null,
      } as unknown as MediaStreamAudioSourceNode;
    }

    createScriptProcessor() {
      return {
        connect: () => {},
        disconnect: () => {},
        onaudioprocess: null,
      } as unknown as ScriptProcessorNode;
    }

    createAnalyser() {
      return {
        connect: () => {},
        disconnect: () => {},
        frequencyBinCount: 1024,
        getByteFrequencyData: () => {},
      } as unknown as AnalyserNode;
    }

    close() {
      return Promise.resolve();
    }

    resume() {
      return Promise.resolve();
    }

    suspend() {
      return Promise.resolve();
    }
  };
};

// ============================================================================
// MediaRecorder Mock
// ============================================================================

const createMediaRecorderMock = () => {
  return class MediaRecorder {
    static isTypeSupported = (mimeType: string) => {
      return ['audio/webm', 'audio/mp4', 'audio/ogg'].includes(mimeType);
    };

    state: RecordingState = 'inactive';
    ondataavailable: ((ev: BlobEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    onstart: (() => void) | null = null;
    onstop: (() => void) | null = null;
    onpause: (() => void) | null = null;
    onresume: (() => void) | null = null;

    constructor(
      public stream: MediaStream,
      public mimeType?: string
    ) {}

    start() {
      this.state = 'recording';
      if (this.onstart) this.onstart();
    }

    stop() {
      this.state = 'inactive';
      if (this.onstop) this.onstop();
      // Simulate data available
      if (this.ondataavailable) {
        this.ondataavailable({
          data: new Blob([''], { type: this.mimeType || 'audio/webm' }),
        } as BlobEvent);
      }
    }

    pause() {
      this.state = 'paused';
      if (this.onpause) this.onpause();
    }

    resume() {
      this.state = 'recording';
      if (this.onresume) this.onresume();
    }

    requestData() {}
  };
};

// ============================================================================
// Navigator Mock
// ============================================================================

const createNavigatorMock = () => ({
  userAgent: 'Node.js/Vitest Test Environment',
  platform: 'linux',
  language: 'en-US',
  languages: ['en-US', 'en'],
  onLine: true,
  cookieEnabled: true,
  doNotTrack: null,
  mediaDevices: {
    getUserMedia: () =>
      Promise.resolve({
        getTracks: () => [{ stop: () => {} }],
        getAudioTracks: () => [{ stop: () => {} }],
        getVideoTracks: () => [],
      } as unknown as MediaStream),
    enumerateDevices: () =>
      Promise.resolve([{ kind: 'audioinput', deviceId: 'default', label: 'Default Microphone' }]),
  },
  clipboard: {
    writeText: () => Promise.resolve(),
    readText: () => Promise.resolve(''),
  },
  serviceWorker: {
    register: () => Promise.resolve({ scope: '/' }),
    ready: Promise.resolve({}),
  },
});

// ============================================================================
// Mock External Libraries
// ============================================================================

// Mock Tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async () => ({
    loadLanguage: vi.fn(async () => {}),
    initialize: vi.fn(async () => {}),
    recognize: vi.fn(async () => ({
      data: {
        text: 'Mocked OCR text',
        confidence: 95,
        words: [],
        lines: [],
      },
    })),
    terminate: vi.fn(async () => {}),
    setParameters: vi.fn(async () => {}),
  })),
}));

// Mock @xenova/transformers
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(async () => ({
    __call__: vi.fn(async () => ({ text: 'Mocked transcription' })),
    dispose: vi.fn(async () => {}),
  })),
  env: {
    allowLocalModels: false,
    useBrowserCache: true,
  },
}));

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn(async () => ({
      embedPdf: vi.fn(async () => ({})),
      embedPage: vi.fn(async () => ({})),
      addPage: vi.fn(() => ({})),
      save: vi.fn(async () => new Uint8Array(0)),
      getPageCount: vi.fn(() => 1),
      getPage: vi.fn(() => ({
        getWidth: () => 612,
        getHeight: () => 792,
        drawText: () => {},
        drawImage: () => {},
      })),
      copyPages: vi.fn(async () => []),
    })),
    load: vi.fn(async () => ({
      getPageCount: vi.fn(() => 1),
      getPage: vi.fn(() => ({
        getWidth: () => 612,
        getHeight: () => 792,
        drawText: () => {},
        drawImage: () => {},
      })),
      save: vi.fn(async () => new Uint8Array(0)),
      copyPages: vi.fn(async () => []),
    })),
  },
  rgb: (r: number, g: number, b: number) => ({ red: r, green: g, blue: b }),
  StandardFonts: {
    Helvetica: 'Helvetica',
    HelveticaBold: 'Helvetica-Bold',
    TimesRoman: 'Times-Roman',
    Courier: 'Courier',
  },
}));

// ============================================================================
// Apply Mocks to Global
// ============================================================================

// Set up global mocks
const localStorageMock = createStorageMock();
const sessionStorageMock = createStorageMock();
const AudioContextMock = createAudioContextMock();
const MediaRecorderMock = createMediaRecorderMock();
const navigatorMock = createNavigatorMock();

// Apply to globalThis (indexedDB is already provided by fake-indexeddb)
Object.assign(globalThis, {
  localStorage: localStorageMock,
  sessionStorage: sessionStorageMock,
  AudioContext: AudioContextMock,
  webkitAudioContext: AudioContextMock,
  MediaRecorder: MediaRecorderMock,
  navigator: navigatorMock,
  atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
  btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
  crypto: {
    subtle: {
      generateKey: () => Promise.resolve({}),
      encrypt: () => Promise.resolve(new ArrayBuffer(0)),
      decrypt: () => Promise.resolve(new ArrayBuffer(0)),
      sign: () => Promise.resolve(new ArrayBuffer(0)),
      verify: () => Promise.resolve(true),
      digest: () => Promise.resolve(new ArrayBuffer(0)),
      importKey: () => Promise.resolve({}),
      exportKey: () => Promise.resolve({}),
      deriveKey: () => Promise.resolve({}),
      deriveBits: () => Promise.resolve(new ArrayBuffer(0)),
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }),
  },
  matchMedia: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
  getSelection: () => ({
    anchorNode: null,
    anchorOffset: 0,
    focusNode: null,
    focusOffset: 0,
    isCollapsed: true,
    rangeCount: 0,
    type: 'None',
    addRange: () => {},
    collapse: () => {},
    collapseToEnd: () => {},
    collapseToStart: () => {},
    containsNode: () => false,
    deleteFromDocument: () => {},
    empty: () => {},
    extend: () => {},
    getRangeAt: () => null,
    removeAllRanges: () => {},
    selectAllChildren: () => {},
    setBaseAndExtent: () => {},
    setPosition: () => {},
    toString: () => '',
  }),
  getComputedStyle: () => ({
    getPropertyValue: () => '',
    length: 0,
    parentRule: null,
    cssText: '',
  }),
});

// ============================================================================
// Test Utilities
// ============================================================================

// Helper to create mock events
export function createMockEvent<T = unknown>(type: string, detail?: T): CustomEvent<T> {
  return new CustomEvent(type, { detail }) as CustomEvent<T>;
}

// Helper to wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to flush all pending timers
export function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Reset all storage mocks between tests
export function resetAllMocks(): void {
  const storage = globalThis.localStorage as ReturnType<typeof createStorageMock>;
  if (storage?.clear) {
    storage.clear();
  }
  const session = globalThis.sessionStorage as ReturnType<typeof createStorageMock>;
  if (session?.clear) {
    session.clear();
  }
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Export mocks for direct use in tests
export { createStorageMock, createAudioContextMock, createMediaRecorderMock, createNavigatorMock };
