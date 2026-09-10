import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/lib/**/*.ts', 'src/components/**/*.tsx', 'src/pages/**/*.tsx'],
      exclude: ['src/**/*.test.{ts,tsx}'],
      thresholds: { statements: 70, branches: 75, functions: 70, lines: 70 },
    },
  },
});
