import { describe, expect, it } from "vitest";
import {
  archiveCohortList,
  normalizeArchivedCohorts,
  restoreCohortList,
  visibleCohorts
} from "@/lib/cohort-archive";

describe("cohort archive helpers", () => {
  it("normalizes archived cohort names without archiving General", () => {
    expect(normalizeArchivedCohorts([" May Hackathon ", "", "General", "May Hackathon"])).toEqual([
      "May Hackathon"
    ]);
  });

  it("hides archived cohorts from active lists without deleting the source list", () => {
    const allCohorts = ["General", "May Hackathon", "June Build Night"];
    const archived = archiveCohortList([], "May Hackathon");

    expect(archived).toEqual(["May Hackathon"]);
    expect(visibleCohorts(allCohorts, archived)).toEqual(["General", "June Build Night"]);
    expect(allCohorts).toEqual(["General", "May Hackathon", "June Build Night"]);
  });

  it("restores archived cohorts to active lists", () => {
    const archived = restoreCohortList(["May Hackathon", "June Build Night"], "May Hackathon");

    expect(archived).toEqual(["June Build Night"]);
    expect(visibleCohorts(["General", "May Hackathon", "June Build Night"], archived)).toEqual([
      "General",
      "May Hackathon"
    ]);
  });
});
