import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/sum.test.ts'],
  },
});
