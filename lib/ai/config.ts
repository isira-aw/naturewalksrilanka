import "server-only";

export function isAiAssistantEnabled() {
  return Boolean(process.env.GOOGLE_AI_API_KEY);
}
