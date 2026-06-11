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

export type TeamReviewChecklistRow = TeamReviewChecklistItem & {
  id: string;
  run_id: string;
  team_id: string;
  updated_at: string;
};

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

export function teamReviewChecklistToRow({
  key,
  checklist,
  updatedAt = new Date().toISOString()
}: {
  key: string;
  checklist: TeamReviewChecklistItem;
  updatedAt?: string;
}): TeamReviewChecklistRow {
  const [runId, teamId] = splitChecklistKey(key);

  return {
    id: key,
    run_id: runId,
    team_id: teamId,
    rolesConfirmed: checklist.rolesConfirmed,
    contactsConfirmed: checklist.contactsConfirmed,
    blockersCleared: checklist.blockersCleared,
    reviewed: checklist.reviewed,
    updated_at: updatedAt
  };
}

export function rowToTeamReviewChecklistEntry(row: TeamReviewChecklistRow): [string, TeamReviewChecklistItem] {
  return [
    row.id || `${row.run_id}::${row.team_id}`,
    {
      rolesConfirmed: row.rolesConfirmed,
      contactsConfirmed: row.contactsConfirmed,
      blockersCleared: row.blockersCleared,
      reviewed: row.reviewed
    }
  ];
}

export function rowsToTeamReviewChecklistStore(rows: TeamReviewChecklistRow[]): TeamReviewChecklistStore {
  return Object.fromEntries(rows.map(rowToTeamReviewChecklistEntry));
}

function splitChecklistKey(key: string) {
  const [runId, ...teamParts] = key.split("::");
  return [runId || "live", teamParts.join("::") || "team"] as const;
}
