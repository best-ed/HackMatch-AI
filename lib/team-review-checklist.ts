export type TeamReviewChecklistItem = {
  rolesConfirmed: boolean;
  contactsConfirmed: boolean;
  blockersCleared: boolean;
  reviewed: boolean;
};

export const emptyTeamReviewChecklist: TeamReviewChecklistItem = {
  rolesConfirmed: false,
  contactsConfirmed: false,
  blockersCleared: false,
  reviewed: false
};

export type TeamReviewChecklistStore = Record<string, TeamReviewChecklistItem>;

export function updateTeamReviewChecklist(
  store: TeamReviewChecklistStore,
  key: string,
  patch: Partial<TeamReviewChecklistItem>
): TeamReviewChecklistStore {
  const current = store[key] ?? emptyTeamReviewChecklist;
  return {
    ...store,
    [key]: {
      ...current,
      ...patch
    }
  };
}

export function checklistCompletion(item?: TeamReviewChecklistItem): number {
  const checklist = item ?? emptyTeamReviewChecklist;
  const values = [
    checklist.rolesConfirmed,
    checklist.contactsConfirmed,
    checklist.blockersCleared,
    checklist.reviewed
  ];
  return values.filter(Boolean).length;
}

export function checklistIsComplete(item?: TeamReviewChecklistItem): boolean {
  return checklistCompletion(item) === 4;
}
