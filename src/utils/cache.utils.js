"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIfJSON = parseIfJSON;
function parseIfJSON(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
//# sourceMappingURL=cache.utils.js.map