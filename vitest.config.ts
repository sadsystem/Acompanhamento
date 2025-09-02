import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run unit tests while skipping legacy client tests
    include: ['shared/**/*.test.ts', 'sum.test.ts'],
    exclude: ['client/**', '**/node_modules/**'],
  },
});
