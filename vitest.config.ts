import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "*.config.ts",
        '**/interfaces/**', // Exclude all files in any interfaces directory
        '**/*.d.ts',        // Exclude all type definition files
      ],
    },
  },
});
