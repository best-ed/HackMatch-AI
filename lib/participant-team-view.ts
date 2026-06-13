import type { Participant, TeamExplanation } from "@/lib/matching/types";

export type ParticipantTeamBrief = {
  visibleContacts: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    links: Array<{ label: string; url: string }>;
  }>;
  contactPrivacy: {
    visibleCount: number;
    hiddenCount: number;
    totalCount: number;
    viewerCanShareContact: boolean;
    summary: string;
    viewerDetail: string;
    hiddenNames: string[];
  };
  sharedInterests: string[];
  sharedAvailability: string[];
  nextSteps: string[];
  warnings: string[];
};

export function buildParticipantTeamBrief(
  members: Participant[],
  explanation?: TeamExplanation,
  viewerId?: string
): ParticipantTeamBrief {
  const sharedInterests = intersectLists(members.map((member) => member.interests)).slice(0, 6);
  const sharedAvailability = intersectLists(members.map((member) => member.availability)).slice(0, 6);
  const visibleContacts = members
    .filter((member) => member.consentToShareContact)
    .map((member) => ({
      id: member.id,
      name: member.fullName,
      email: member.email,
      phone: member.phone,
      links: [
        member.githubUrl ? { label: "GitHub", url: member.githubUrl } : undefined,
        member.linkedinUrl ? { label: "LinkedIn", url: member.linkedinUrl } : undefined,
        member.portfolioUrl ? { label: "Portfolio", url: member.portfolioUrl } : undefined
      ].filter((link): link is { label: string; url: string } => Boolean(link))
    }));
  const hiddenContactMembers = members.filter((member) => !member.consentToShareContact);
  const viewer = viewerId ? members.find((member) => member.id === viewerId) : undefined;
  const hiddenCount = hiddenContactMembers.length;
  const contactPrivacy = {
    visibleCount: visibleContacts.length,
    hiddenCount,
    totalCount: members.length,
    viewerCanShareContact: Boolean(viewer?.consentToShareContact),
    summary: hiddenCount
      ? `${visibleContacts.length}/${members.length} teammate contact record(s) are visible. ${hiddenCount} remain hidden by consent.`
      : members.length
        ? "Every teammate has allowed contact details to appear in this handoff."
        : "Contact visibility appears after a team assignment is loaded.",
    viewerDetail: viewer
      ? viewer.consentToShareContact
        ? "Your email, phone, and profile links can appear to assigned teammates when available."
        : "Your contact details stay hidden from assigned teammates; the organizer may need to coordinate introductions."
      : "Look up your participant access link to see your own contact-sharing state.",
    hiddenNames: hiddenContactMembers.map((member) => member.fullName).sort((left, right) => left.localeCompare(right))
  };
  const warnings = [
    ...(explanation?.warnings ?? []),
    visibleContacts.length === 0 ? "No teammates have enabled contact sharing yet." : ""
  ].filter(Boolean);

  return {
    visibleContacts,
    contactPrivacy,
    sharedInterests,
    sharedAvailability,
    warnings,
    nextSteps: [
      "Confirm who will own the technical demo, pitch narrative, and final submission.",
      sharedAvailability.length > 0
        ? `Use ${formatAvailability(sharedAvailability[0])} as the first coordination window.`
        : "Pick a shared meeting window before project scoping.",
      explanation?.suggestedProjectDirection
        ? `Start with: ${explanation.suggestedProjectDirection}`
        : "Choose a narrow project idea with one demoable outcome."
    ]
  };
}

export function formatAvailability(slot: string): string {
  return slot.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function intersectLists(lists: string[][]): string[] {
  if (lists.length === 0) return [];
  const normalizedLists = lists.map((items) =>
    new Set(items.map((item) => item.trim()).filter(Boolean))
  );
  const [first, ...rest] = normalizedLists;
  return Array.from(first)
    .filter((item) => rest.every((set) => set.has(item)))
    .sort((left, right) => left.localeCompare(right));
}
