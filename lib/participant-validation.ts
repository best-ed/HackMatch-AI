import type { Participant } from "@/lib/matching/types";

export type ParticipantValidation = {
  errors: string[];
  warnings: string[];
};

function hasValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidOptionalUrl(value?: string): boolean {
  if (!value?.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateParticipantRegistration(
  participant: Participant,
  existingParticipants: Participant[] = []
): ParticipantValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const email = participant.email.trim().toLowerCase();

  if (!participant.fullName.trim()) errors.push("Full name is required.");
  if (!email) {
    errors.push("Email is required.");
  } else if (!hasValidEmail(email)) {
    errors.push("Email must be a valid address.");
  }

  const duplicateEmail = existingParticipants.some((existing) =>
    existing.id !== participant.id && existing.email.trim().toLowerCase() === email
  );
  if (duplicateEmail) errors.push("A participant with this email already exists.");

  if (!participant.primaryRole.trim()) errors.push("Primary role is required.");
  if (participant.availability.length === 0) errors.push("Select at least one availability slot.");
  if (!participant.consentToMatch) errors.push("Consent to match is required for team assignment.");

  if (!isValidOptionalUrl(participant.githubUrl)) errors.push("GitHub URL must start with http:// or https://.");
  if (!isValidOptionalUrl(participant.linkedinUrl)) errors.push("LinkedIn URL must start with http:// or https://.");
  if (!isValidOptionalUrl(participant.portfolioUrl)) errors.push("Portfolio URL must start with http:// or https://.");

  if (participant.technicalSkills.length === 0) warnings.push("Add at least one technical skill to improve matching quality.");
  if (participant.interests.length === 0) warnings.push("Add at least one interest to help align project direction.");
  if (!participant.consentToShareContact) warnings.push("Contact sharing is off; teammates may need another way to coordinate.");

  return { errors, warnings };
}
