import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run unit tests while skipping legacy client tests
    include: ['**/*.{test,spec}.ts'],
    exclude: ['client/src/__tests__/**', '**/node_modules/**'],
  },
});
