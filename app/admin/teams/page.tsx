"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card } from "@/components/ui";
import type { ExplanationServiceResult } from "@/lib/ai/explanation-service";
import { teamsToCsv } from "@/lib/export";
import { useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";
import type { MatchingResult, Participant, SavedMatchRun, TeamExplanation } from "@/lib/matching/types";

export default function AdminTeamsPage() {
  const {
    cohortParticipants,
    settings,
    savedMatchRuns,
    saveMatchRun,
    deleteMatchRun,
    activeCohort,
    setActiveCohort,
    cohorts
  } = useHackMatchData();
  const result = useMemo(
    () => generateTeams(cohortParticipants, settings),
    [cohortParticipants, settings]
  );
  const [activeRunId, setActiveRunId] = useState("live");
  const activeRun = savedMatchRuns.find((run) => run.id === activeRunId);
  const activeResult = activeRun?.result ?? result;
  const activeParticipants = activeRun?.participantsSnapshot ?? cohortParticipants;
  const isViewingSavedRun = Boolean(activeRun);
  const heading = activeRun?.name ?? "Generated teams";
  const csv = teamsToCsv(activeResult, activeParticipants);
  const csvPreview = csv.split("\n").slice(0, 4).join("\n");
  const [explanations, setExplanations] = useState<TeamExplanation[]>(activeResult.explanations);
  const [explanationProvider, setExplanationProvider] = useState<"fallback" | "openai">("fallback");
  const [explanationModel, setExplanationModel] = useState<string | undefined>();
  const [explanationWarnings, setExplanationWarnings] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runName, setRunName] = useState("");

  useEffect(() => {
    setExplanations(activeResult.explanations);
    setExplanationProvider("fallback");
    setExplanationModel(undefined);
    setExplanationWarnings([]);
  }, [activeResult.explanations]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hackmatch-teams.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function refreshExplanations() {
    if (isViewingSavedRun) {
      setExplanationWarnings(["Saved runs are frozen snapshots. Switch to live generated teams to refresh explanations."]);
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch("/api/explanations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participants: cohortParticipants, settings })
      });
      if (!response.ok) {
        setExplanationWarnings(["Explanation API request failed; showing deterministic fallback explanations."]);
        setExplanations(result.explanations);
        setExplanationProvider("fallback");
        return;
      }
      const payload = (await response.json()) as ExplanationServiceResult;
      setExplanations(payload.explanations);
      setExplanationProvider(payload.provider);
      setExplanationModel(payload.model);
      setExplanationWarnings(payload.warnings);
    } catch {
      setExplanationWarnings(["Explanation API request could not be completed; showing deterministic fallback explanations."]);
      setExplanations(result.explanations);
      setExplanationProvider("fallback");
      setExplanationModel(undefined);
    } finally {
      setIsRefreshing(false);
    }
  }

  function saveCurrentRun() {
    const run = saveMatchRun(result, runName);
    setRunName("");
    setActiveRunId(run.id);
  }

  function removeRun(run: SavedMatchRun) {
    deleteMatchRun(run.id);
    if (activeRunId === run.id) {
      setActiveRunId("live");
    }
  }

  async function copyTeamSummary(
    teamName: string,
    members: Participant[],
    explanation?: TeamExplanation
  ) {
    const summary = [
      `${teamName}`,
      `Members: ${members.map((member) => `${member.fullName} (${member.primaryRole})`).join(", ")}`,
      explanation ? `Why this team: ${explanation.summary}` : "",
      explanation ? `Suggested direction: ${explanation.suggestedProjectDirection}` : ""
    ].filter(Boolean).join("\n");

    await navigator.clipboard?.writeText(summary);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {heading}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isViewingSavedRun
              ? `Frozen match run saved ${formatDate(activeRun?.createdAt ?? "")}. Exports use this exact snapshot.`
              : "Live assignments, score breakdowns, explanations, and export from edited data."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-56 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            value={runName}
            onChange={(event) => setRunName(event.target.value)}
            placeholder={`Match run ${savedMatchRuns.length + 1}`}
          />
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={saveCurrentRun}>
            Save generated teams
          </button>
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={refreshExplanations} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh explanations"}
          </button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={downloadCsv}>
            Download CSV
          </button>
        </div>
      </div>
      <Card className="flex flex-wrap items-end justify-between gap-4">
        <label className="space-y-2 text-sm font-medium">
          <span>Active cohort</span>
          <input
            className="w-72 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
            list="teams-cohorts"
            value={activeCohort}
            onChange={(event) => setActiveCohort(event.target.value)}
            disabled={isViewingSavedRun}
          />
          <datalist id="teams-cohorts">
            {cohorts.map((cohort) => <option key={cohort} value={cohort} />)}
          </datalist>
        </label>
        <Badge>
          {isViewingSavedRun
            ? `${activeRun?.cohort ?? "Saved cohort"} snapshot`
            : `${cohortParticipants.length} participant(s) in cohort`}
        </Badge>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Match run view</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save a generated run to freeze teams, scores, warnings, explanations, and export output.
            </p>
          </div>
          <Badge>{savedMatchRuns.length} saved</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <button
            className={runButtonClass(activeRunId === "live")}
            onClick={() => setActiveRunId("live")}
            type="button"
          >
            Live generated teams
          </button>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {savedMatchRuns.map((run) => (
              <div
                key={run.id}
                className={`rounded-md border p-3 ${activeRunId === run.id ? "border-primary bg-emerald-50" : "border-border bg-white"}`}
              >
                <button
                  className="block w-full text-left"
                  onClick={() => setActiveRunId(run.id)}
                  type="button"
                >
                  <div className="font-semibold">{run.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDate(run.createdAt)}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{run.result.teams.length} teams</Badge>
                    <Badge>{run.assignedCount}/{run.participantCount} assigned</Badge>
                    <Badge>Avg {run.averageScore}</Badge>
                  </div>
                </button>
                <button
                  className="mt-3 text-xs font-semibold text-rose-700"
                  onClick={() => removeRun(run)}
                  type="button"
                >
                  Delete saved run
                </button>
              </div>
            ))}
            {savedMatchRuns.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No saved runs yet.
              </div>
            ) : null}
          </div>
        </div>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Explanation provider</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Team assignment remains deterministic; this layer only explains already-generated teams.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={explanationProvider === "openai" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}>
            {explanationProvider === "openai" ? "OpenAI" : "Deterministic fallback"}
          </Badge>
          {explanationModel ? <Badge>{explanationModel}</Badge> : null}
        </div>
      </Card>
      {explanationWarnings.length > 0 ? (
        <Card>
          <h2 className="font-semibold">Explanation warnings</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {explanationWarnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </Card>
      ) : null}
      <div className="grid gap-5">
        {activeResult.teams.map((team) => {
          const explanation = explanations.find((item) => item.teamId === team.id);
          const members = team.participantIds
            .map((id) => activeParticipants.find((item) => item.id === id))
            .filter((participant): participant is Participant => Boolean(participant));
          const risks = getTeamRisks(team.score?.totalScore ?? 0, explanation);
          return (
            <Card key={team.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{team.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge className={scoreBadgeClass(team.score?.totalScore ?? 0)}>
                      Overall {team.score?.totalScore}
                    </Badge>
                    {risks.map((risk) => (
                      <Badge key={risk} className="bg-amber-100 text-amber-800">{risk}</Badge>
                    ))}
                  </div>
                </div>
                <button
                  className="rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold"
                  onClick={() => void copyTeamSummary(team.name, members, explanation)}
                  type="button"
                >
                  Copy summary
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {members.map((participant) => (
                  <div key={participant.id} className="rounded-md border border-border p-3">
                    <div className="font-medium">{participant.fullName}</div>
                    <div className="text-sm text-muted-foreground">{participant.primaryRole} - {participant.experienceLevel}</div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {participant.technicalSkills.slice(0, 3).map((skill) => (
                        <Badge key={skill}>{skill}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {team.score ? (
                <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <ScoreBar label="Role coverage" value={team.score.roleCoverageScore} />
                  <ScoreBar label="Skill coverage" value={team.score.skillCoverageScore} />
                  <ScoreBar label="Experience balance" value={team.score.experienceBalanceScore} />
                  <ScoreBar label="Interest alignment" value={team.score.interestAlignmentScore} />
                  <ScoreBar label="Availability" value={team.score.availabilityCompatibilityScore} />
                  <ScoreBar label="Preferences" value={team.score.preferenceSatisfactionScore} />
                  <ScoreBar label="Penalty" value={team.score.constraintPenalty} invert />
                </div>
              ) : null}
              {explanation ? (
                <div className="grid gap-4 rounded-md bg-muted p-4 text-sm lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold">
                        {explanationProvider === "openai" ? "AI explanation" : "Fallback explanation"}
                      </div>
                      <p className="mt-1 text-muted-foreground">{explanation.summary}</p>
                    </div>
                    <ReviewList title="Strengths" items={explanation.strengths} />
                    <ReviewList title="Watch points" items={explanation.weaknesses} />
                    {explanation.warnings.length > 0 ? <ReviewList title="Warnings" items={explanation.warnings} /> : null}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="font-semibold">Suggested direction</div>
                      <p className="mt-1 text-muted-foreground">{explanation.suggestedProjectDirection}</p>
                    </div>
                    <div>
                      <div className="font-semibold">Suggested internal roles</div>
                      <div className="mt-2 grid gap-2">
                        {Object.entries(explanation.suggestedInternalRoles).map(([name, role]) => (
                          <div key={name} className="flex justify-between gap-3 rounded-md bg-white px-3 py-2">
                            <span>{name}</span>
                            <span className="text-right text-muted-foreground">{role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
      <Card>
        <h2 className="font-semibold">CSV preview</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-950 p-4 text-xs text-white">{csvPreview}</pre>
      </Card>
    </div>
  );
}

function ScoreBar({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const normalized = Math.max(0, Math.min(100, value));
  const healthy = invert ? value <= 10 : value >= 75;
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="font-medium">{label}</div>
        <div className={healthy ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{value}</div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${healthy ? "bg-primary" : "bg-amber-500"}`}
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="font-semibold">{title}</div>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function getTeamRisks(score: number, explanation?: TeamExplanation) {
  const risks: string[] = [];
  if (score < 75) risks.push("Review score");
  if (explanation?.warnings.length) risks.push("Has warnings");
  if ((explanation?.weaknesses.length ?? 0) >= 2) risks.push("Watch points");
  return risks;
}

function scoreBadgeClass(score: number) {
  if (score >= 85) return "bg-emerald-100 text-emerald-800";
  if (score >= 75) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function runButtonClass(active: boolean) {
  return `rounded-md border px-4 py-3 text-left text-sm font-semibold ${
    active ? "border-primary bg-emerald-50 text-foreground" : "border-border bg-white text-muted-foreground"
  }`;
}
