// src/utils/logger.js
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args) {
    originalConsoleLog.apply(console, args);
};

console.error = function (...args) {
    originalConsoleError.apply(console, args);
};

export const logger = {
    log: console.log,
    error: console.error,
    info: console.log,
    warn: console.log,
};
