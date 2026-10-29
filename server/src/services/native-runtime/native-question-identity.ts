export const QUESTION_KEY_PREFIX = "paperclip-runner-question:";
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

export interface NativeQuestionIdentity {
  idempotencyKey?: string | null;
  sourceRunId?: string | null;
  payload: unknown;
}

export function requestIdForInteraction(
  interaction: NativeQuestionIdentity,
): string | null {
  const payload = interaction.payload && typeof interaction.payload === "object" && !Array.isArray(interaction.payload)
    ? interaction.payload as Record<string, unknown>
    : null;
  if (!interaction.sourceRunId || !payload?.questionSet) return null;
  const key = interaction.idempotencyKey;
  const expectedPrefix = `${QUESTION_KEY_PREFIX}${interaction.sourceRunId}:`;
  if (!key?.startsWith(expectedPrefix)) return null;
  const requestId = key.slice(expectedPrefix.length);
  if (!REQUEST_ID_PATTERN.test(requestId)) return null;
  return typeof payload.runtimeRequestId === "string" && payload.runtimeRequestId !== requestId
    ? null
    : requestId;
}
