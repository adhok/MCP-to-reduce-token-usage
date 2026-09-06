import { runAndSummarize } from "../dist/tools/runAndSummarize.js";

const result = await runAndSummarize({
  command: "python3 scripts/benchmark-forecasting.py",
  maxTokens: 1200,
  timeoutMs: 600000,
});

console.log(result.summary);
console.log(JSON.stringify({
  sourceTokens: result.tokenMetadata.sourceTokens,
  returnedTokens: result.tokenMetadata.returnedTokens,
  estimatedTokensSaved: result.tokenMetadata.estimatedTokensSaved,
  estimatedSavingsPercent: result.tokenMetadata.estimatedSavingsPercent,
  factsDetected: result.factsDetected,
  factsPreserved: result.factsPreserved,
  importantOutputTruncated: result.importantOutputTruncated,
  exitCode: result.exitCode,
}));
