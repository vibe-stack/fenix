export function formatFrameBudget(stepRateHz: number): string {
  const frameBudgetMs = 1000 / stepRateHz

  return `${frameBudgetMs.toFixed(2)} ms / step`
}
