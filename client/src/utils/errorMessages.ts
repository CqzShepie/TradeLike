const technicalPatterns = [
  /\bSystem\./i,
  /\bMicrosoft\./i,
  /\bInvalid object name\b/i,
  /\bDbUpdateException\b/i,
  /\bSqlException\b/i,
  /\bEntityFrameworkCore\b/i,
  /\bat\s+[\w.<>]+\(.*:\w+\s+\d+\)/i,
  /\bat\s+[\w.<>]+\./i,
];

export function friendlyErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";

  if (!message || isTechnicalMessage(message)) {
    return fallback;
  }

  return message;
}

export function isTechnicalMessage(message: string) {
  return technicalPatterns.some(pattern => pattern.test(message));
}
