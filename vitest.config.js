"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
exports.default = (0, config_1.defineConfig)({
    test: {
        coverage: {
            exclude: [
                "*.config.ts",
                "**/interfaces/**", // Exclude all files in any interfaces directory
                "**/*.d.ts", // Exclude all type definition files
            ],
        },
    },
});
//# sourceMappingURL=vitest.config.js.map