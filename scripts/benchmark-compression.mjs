import { runAndSummarize, summarizeOutput } from "../dist/tools/runAndSummarize.js";

const cases = [
  {
    name: "large generic command output",
    run: () => runAndSummarize({
      command: "node -e \"for (let i = 1; i <= 1000; i++) console.log('diagnostic line ' + i + ' repeated output')\"",
      maxTokens: 1200,
    }),
  },
  {
    name: "pytest failure summary",
    run: async () => {
      const raw = "========================= test session starts =========================\n98 passed, 2 failed\nFAILED tests/login.py::test_invalid_token - Expected 401\nE AssertionError: Expected 401\n";
      const summary = summarizeOutput("pytest", raw);
      return {
        summary: summary.text,
        tokenMetadata: {
          sourceTokens: Math.ceil(raw.length / 4),
          returnedTokens: Math.ceil(summary.text.length / 4),
          estimatedTokensSaved: Math.max(0, Math.ceil(raw.length / 4) - Math.ceil(summary.text.length / 4)),
          estimatedSavingsPercent: Math.round((Math.max(0, raw.length - summary.text.length) / raw.length) * 10000) / 100,
        },
      };
    },
  },
];

for (const testCase of cases) {
  const result = await testCase.run();
  const metadata = result.tokenMetadata;
  console.log(JSON.stringify({
    name: testCase.name,
    sourceTokens: metadata.sourceTokens,
    returnedTokens: metadata.returnedTokens,
    estimatedTokensSaved: metadata.estimatedTokensSaved,
    estimatedSavingsPercent: metadata.estimatedSavingsPercent,
  }));
}
