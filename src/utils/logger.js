// src/utils/logger.js
import { createWriteStream } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup logging to file
const logStream = createWriteStream(path.join(__dirname, "../../server.log"), {
  flags: "a",
});

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args) {
  originalConsoleLog.apply(console, args);
  logStream.write(args.join(" ") + "\n");
};

console.error = function (...args) {
  originalConsoleError.apply(console, args);
  logStream.write(args.join(" ") + "\n");
};

export const logger = {
  log: console.log,
  error: console.error,
  info: console.log,
  warn: console.log,
};
