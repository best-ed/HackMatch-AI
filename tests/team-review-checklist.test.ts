import { describe, expect, it } from "vitest";
import {
  checklistCompletion,
  checklistIsComplete,
  rowToTeamReviewChecklistEntry,
  rowsToTeamReviewChecklistStore,
  teamReviewChecklistToRow,
  updateTeamReviewChecklist
} from "@/lib/team-review-checklist";

describe("team review checklist", () => {
  it("updates one team checklist without mutating other teams", () => {
    const next = updateTeamReviewChecklist(
      {
        "run-1::team-1": {
          rolesConfirmed: false,
          contactsConfirmed: false,
          blockersCleared: false,
          reviewed: false
        }
      },
      "run-1::team-2",
      { rolesConfirmed: true, reviewed: true }
    );

    expect(next["run-1::team-1"].reviewed).toBe(false);
    expect(next["run-1::team-2"].rolesConfirmed).toBe(true);
    expect(next["run-1::team-2"].reviewed).toBe(true);
  });

  it("summarizes completion", () => {
    const item = {
      rolesConfirmed: true,
      contactsConfirmed: true,
      blockersCleared: true,
      reviewed: false
    };

    expect(checklistCompletion(item)).toBe(3);
    expect(checklistIsComplete(item)).toBe(false);
    expect(checklistIsComplete({ ...item, reviewed: true })).toBe(true);
  });

  it("serializes checklist state for remote persistence", () => {
    const row = teamReviewChecklistToRow({
      key: "run-1::team-1",
      checklist: {
        rolesConfirmed: true,
        contactsConfirmed: false,
        blockersCleared: true,
        reviewed: false
      },
      updatedAt: "2026-06-11T08:00:00.000Z"
    });

    expect(row).toMatchObject({
      id: "run-1::team-1",
      run_id: "run-1",
      team_id: "team-1",
      rolesConfirmed: true,
      blockersCleared: true
    });
    expect(rowToTeamReviewChecklistEntry(row)[0]).toBe("run-1::team-1");
  });

  it("hydrates a checklist store from remote rows", () => {
    const store = rowsToTeamReviewChecklistStore([
      {
        id: "run-1::team-2",
        run_id: "run-1",
        team_id: "team-2",
        rolesConfirmed: false,
        contactsConfirmed: true,
        blockersCleared: false,
        reviewed: true,
        updated_at: "2026-06-11T08:00:00.000Z"
      }
    ]);

    expect(store["run-1::team-2"].contactsConfirmed).toBe(true);
    expect(store["run-1::team-2"].reviewed).toBe(true);
  });
});
