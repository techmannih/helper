import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import type { HelperConfig } from '../types';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

