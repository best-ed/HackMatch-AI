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
    participants,
    settings,
    savedMatchRuns,
    saveMatchRun,
    deleteMatchRun
  } = useHackMatchData();
  const result = useMemo(
    () => generateTeams(participants, settings),
    [participants, settings]
  );
  const [activeRunId, setActiveRunId] = useState("live");
  const activeRun = savedMatchRuns.find((run) => run.id === activeRunId);
  const activeResult = activeRun?.result ?? result;
  const activeParticipants = activeRun?.participantsSnapshot ?? participants;
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
        body: JSON.stringify({ participants, settings })
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
          return (
            <Card key={team.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{team.name}</h2>
                <Badge>Overall {team.score?.totalScore}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {team.participantIds.map((id) => {
                  const participant = activeParticipants.find((item) => item.id === id);
                  return participant ? (
                    <div key={id} className="rounded-md border border-border p-3">
                      <div className="font-medium">{participant.fullName}</div>
                      <div className="text-sm text-muted-foreground">{participant.primaryRole} - {participant.experienceLevel}</div>
                    </div>
                  ) : null;
                })}
              </div>
              {team.score ? (
                <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Score label="Role" value={team.score.roleCoverageScore} />
                  <Score label="Skill" value={team.score.skillCoverageScore} />
                  <Score label="Experience" value={team.score.experienceBalanceScore} />
                  <Score label="Interest" value={team.score.interestAlignmentScore} />
                  <Score label="Availability" value={team.score.availabilityCompatibilityScore} />
                  <Score label="Preferences" value={team.score.preferenceSatisfactionScore} />
                  <Score label="Penalty" value={team.score.constraintPenalty} />
                </div>
              ) : null}
              {explanation ? (
                <div className="rounded-md bg-muted p-4 text-sm">
                  <div className="font-semibold">
                    {explanationProvider === "openai" ? "AI explanation" : "Fallback explanation"}
                  </div>
                  <p className="mt-1 text-muted-foreground">{explanation.summary}</p>
                  <p className="mt-2 text-muted-foreground">{explanation.suggestedProjectDirection}</p>
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

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="font-semibold">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
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
