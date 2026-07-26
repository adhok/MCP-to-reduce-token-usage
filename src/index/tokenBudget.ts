export interface TokenBudgetMetadata {
  estimationMethod: "approximate-characters-per-token";
  sourceCharacters: number;
  returnedCharacters: number;
  sourceTokens: number;
  returnedTokens: number;
  estimatedTokensSaved: number;
  estimatedSavingsPercent: number;
  maxTokens?: number;
}

export function estimateTokens(text: string): number {
  return text.length === 0 ? 0 : Math.ceil(text.length / 4);
}

export function tokenMetadata(source: string, returned: string, maxTokens?: number): TokenBudgetMetadata {
  const sourceTokens = estimateTokens(source);
  const returnedTokens = estimateTokens(returned);
  const estimatedTokensSaved = Math.max(0, sourceTokens - returnedTokens);
  return {
    estimationMethod: "approximate-characters-per-token",
    sourceCharacters: source.length,
    returnedCharacters: returned.length,
    sourceTokens,
    returnedTokens,
    estimatedTokensSaved,
    estimatedSavingsPercent: sourceTokens === 0 ? 0 : Math.round((estimatedTokensSaved / sourceTokens) * 10000) / 100,
    ...(maxTokens === undefined ? {} : { maxTokens }),
  };
}

export function applyTokenBudget(text: string, maxTokens?: number): string {
  if (maxTokens === undefined || estimateTokens(text) <= maxTokens) return text;
  const marker = "\n... output truncated to token budget ...";
  const maxCharacters = maxTokens * 4;
  if (maxCharacters <= marker.length) return marker.slice(0, maxCharacters);
  return `${text.slice(0, maxCharacters - marker.length)}${marker}`;
}
