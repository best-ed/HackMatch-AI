import type { Participant } from "@/lib/matching/types";

export type AccessTokenRotationPreview = {
  participantId: string;
  participantName: string;
  oldTokenLabel: string;
  warning: string;
};

export function buildAccessTokenRotationPreview(participant: Participant): AccessTokenRotationPreview {
  return {
    participantId: participant.id,
    participantName: participant.fullName || participant.email || participant.id,
    oldTokenLabel: maskAccessToken(participant.accessToken),
    warning: "Regenerating this token invalidates any previously shared participant team link."
  };
}

export function accessTokenRotationMessage({
  participant,
  oldToken,
  newToken
}: {
  participant: Participant;
  oldToken?: string;
  newToken: string;
}) {
  const name = participant.fullName || participant.email || participant.id;
  return `${name} now uses ${maskAccessToken(newToken)}. Previous link ${maskAccessToken(oldToken)} is invalid.`;
}

export function maskAccessToken(token?: string) {
  const cleaned = token?.trim();
  if (!cleaned) return "not generated";
  if (cleaned.length <= 9) return cleaned;
  return `${cleaned.slice(0, 5)}...${cleaned.slice(-3)}`;
}
