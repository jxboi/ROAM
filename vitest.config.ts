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
      // Pages are exercised end to end in e2e/, at two viewports, against the
      // real build. The unit gate covers the logic and components underneath.
      include: ['src/lib/**/*.ts*', 'src/components/**/*.tsx'],
      exclude: ['src/**/*.test.{ts,tsx}'],
      thresholds: { statements: 90, branches: 82, functions: 90, lines: 95 },
    },
  },
});
