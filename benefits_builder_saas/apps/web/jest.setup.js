// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill for fetch
import 'whatwg-fetch'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3002'

// Mock Next.js server Response/Request
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => {
      const body = JSON.stringify(data);
      const status = init?.status || 200;
      const headers = new Headers(init?.headers || {});
      headers.set('content-type', 'application/json');

      return {
        ok: status >= 200 && status < 300,
        status: status,
        statusText: '',
        headers: headers,
        body: body,
        json: async () => JSON.parse(body),
        text: async () => body,
        arrayBuffer: async () => new TextEncoder().encode(body).buffer,
        blob: async () => new Blob([body]),
      };
    },
  },
  NextRequest: class extends Request {},
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
      route: '/',
      refresh: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  createServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))

// Helper to create NextRequest for tests
global.createTestRequest = (url, options = {}) => {
  const requestInit = {
    method: options.method || 'GET',
    headers: options.headers || {},
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    requestInit.body = JSON.stringify(options.body);
    if (!requestInit.headers['content-type']) {
      requestInit.headers['content-type'] = 'application/json';
    }
  }

  return new Request(url, requestInit);
}
