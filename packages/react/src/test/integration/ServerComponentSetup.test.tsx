import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { HelperProvider } from '../../components/HelperProvider';
import { generateHelperAuth } from '../../server/helper-auth';
import { mockHelperWidget, setupTestEnv, cleanupTestEnv } from '../utils';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock client component
const ClientComponent = () => {
  return <div data-testid="client-component">Client Component</div>;
};

describe('Server Component Integration', () => {
  const mockEmail = 'test@example.com';
  let mocks: ReturnType<typeof mockHelperWidget>;

  beforeEach(() => {
    setupTestEnv();
    mocks = mockHelperWidget();
  });

  afterEach(() => {
    cleanupTestEnv();
  });

  it('renders server component with generated HMAC', () => {
    const mockConfig = {
      ...generateHelperAuth({ email: mockEmail }),
      title: 'Test Helper',
      customer_metadata: {},
    };

    render(
      <HelperProvider {...mockConfig}>
        <div data-testid="server-content">Server Content</div>
      </HelperProvider>
    );

    expect(screen.getByTestId('server-content')).toBeInTheDocument();
  });

  it('initializes Helper with correct HMAC configuration', () => {
    const mockConfig = {
      ...generateHelperAuth({ email: mockEmail }),
      title: 'Test Helper',
      customer_metadata: {},
    };

    render(
      <HelperProvider {...mockConfig}>
        <div>Test Content</div>
      </HelperProvider>
    );

    const script = document.querySelector('script');
    act(() => {
      script?.dispatchEvent(new Event('load'));
    });

    expect(mocks.mockInit).toHaveBeenCalledWith(mockConfig);
  });

  it('works with nested client components', () => {
    const mockConfig = {
      ...generateHelperAuth({ email: mockEmail }),
      title: 'Test Helper',
      customer_metadata: {},
    };

    render(
      <HelperProvider {...mockConfig}>
        <div data-testid="server-content">
          <ClientComponent />
        </div>
      </HelperProvider>
    );

    expect(screen.getByTestId('server-content')).toBeInTheDocument();
    expect(screen.getByTestId('client-component')).toBeInTheDocument();
  });
}); 
