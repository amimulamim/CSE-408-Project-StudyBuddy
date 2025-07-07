import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Global variable to track current test file
(global as any).__BILLING_TEST__ = false;

// Function to get the appropriate backend URL based on the test context
function getTestBackendUrl() {
  // Check if this is a billing test through global flag or stack trace
  if ((global as any).__BILLING_TEST__) {
    return 'https://studdybuddy.me';
  }
  
  // Fallback: check stack trace for billing directory
  const stack = new Error().stack;
  if (stack?.includes('/billing/') || stack?.includes('billing')) {
    return 'https://studdybuddy.me';
  }
  
  return 'http://localhost:8000';
}

// Mock environment variables for testing
vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:8000');

// Override import.meta.env with dynamic URL resolution
Object.defineProperty(import.meta, 'env', {
  get() {
    return {
      ...import.meta.env,
      VITE_BACKEND_URL: getTestBackendUrl(),
      MODE: 'test',
      DEV: false,
      PROD: false,
      SSR: false
    };
  },
  configurable: true
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  callback: ResizeObserverCallback;
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn() as any;

// Mock HTMLElement methods
HTMLElement.prototype.scrollIntoView = vi.fn() as any;
HTMLElement.prototype.hasPointerCapture = vi.fn() as any;
HTMLElement.prototype.releasePointerCapture = vi.fn() as any;
HTMLElement.prototype.setPointerCapture = vi.fn() as any;

// Mock getComputedStyle
(window as any).getComputedStyle = vi.fn(() => ({
  getPropertyValue: vi.fn(() => ''),
}));

// Mock requestAnimationFrame
(global as any).requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => setTimeout(cb, 0));
(global as any).cancelAnimationFrame = vi.fn();

// Mock Image constructor for avatar tests
(global as any).Image = class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  alt: string = '';
  
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 100);
  }
};
