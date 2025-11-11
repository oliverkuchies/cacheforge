import { defineConfig } from "vitest/config";

export const config = {
	test: {
		coverage: {
			exclude: [
				"*.config.ts",
				"**/interfaces/**", // Exclude all files in any interfaces directory
				"**/*.d.ts", // Exclude all type definition files,
				"dist/**",
				"tests/**",
			],
		},
		exclude: ["**/benchmarks/**", "node_modules/**"],
	}
};

export default defineConfig({
	...config,
});
