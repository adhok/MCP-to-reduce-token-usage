import { runAndSummarize } from "../dist/tools/runAndSummarize.js";

const result = await runAndSummarize({
  command: "node -e \"for (let i = 1; i <= 1000; i++) console.log('agent benchmark diagnostic line ' + i)\"",
  maxTokens: 1200,
});

console.log(JSON.stringify({
  scenario: "same command: raw output versus MCP response",
  rawTokens: result.tokenMetadata.sourceTokens,
  compressedTokens: result.tokenMetadata.returnedTokens,
  estimatedTokensSaved: result.tokenMetadata.estimatedTokensSaved,
  estimatedSavingsPercent: result.tokenMetadata.estimatedSavingsPercent,
  factsDetected: result.factsDetected,
  factsPreserved: result.factsPreserved,
  importantOutputTruncated: result.importantOutputTruncated,
}));
