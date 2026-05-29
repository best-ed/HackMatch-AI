"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, TextInput } from "@/components/ui";
import {
  readCurrentParticipantLookup,
  useHackMatchData,
  writeCurrentParticipantLookup
} from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";

export default function ParticipantTeamPage() {
  const { participants, settings } = useHackMatchData();
  const result = useMemo(
    () => generateTeams(participants, settings),
    [participants, settings]
  );
  const defaultParticipant = participants.find((item) => item.consentToMatch) ?? participants[0];
  const [lookup, setLookup] = useState(defaultParticipant?.email ?? "");
  const normalizedLookup = normalizeLookupValue(lookup);
  const participant = normalizedLookup
    ? participants.find((item) => {
    const searchableValues = [
      item.id,
      item.fullName,
      item.email,
      item.email.split("@")[0]
    ];
    return searchableValues.some((value) =>
      normalizeLookupValue(value).includes(normalizedLookup)
    );
  })
    : undefined;
  const team = participant?.consentToMatch
    ? result.teams.find((candidate) => candidate.participantIds.includes(participant.id))
    : undefined;
  const members = team
    ? team.participantIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean)
    : [];
  const explanation = result.explanations.find((item) => item.teamId === team?.id);
  const isUnassigned = participant
    ? result.unassignedParticipants.includes(participant.id)
    : false;

  useEffect(() => {
    const participantLookup = new URLSearchParams(window.location.search).get("participant");
    const savedLookup = readCurrentParticipantLookup();
    const nextLookup = participantLookup || savedLookup || defaultParticipant?.email || "";
    setLookup(nextLookup);
  }, [defaultParticipant?.email]);

  function updateLookup(value: string) {
    setLookup(value);
    if (value.trim()) {
      writeCurrentParticipantLookup(value);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My team</h1>
          <p className="mt-2 text-muted-foreground">
            Enter a participant email or ID to preview the deterministic assignment.
          </p>
        </div>
        <Badge>{result.teams.length} generated teams</Badge>
      </div>
      <Card className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="space-y-2">
          <span className="text-sm font-semibold">Participant lookup</span>
          <TextInput
            value={lookup}
            onChange={(event) => updateLookup(event.target.value)}
            placeholder="Maya Patel, maya.patel@example.com, or p02"
          />
        </label>
        <div className="flex items-end">
          <Button
            className="w-full md:w-auto"
            onClick={() => updateLookup(defaultParticipant?.email ?? "")}
            type="button"
          >
            Use demo participant
          </Button>
        </div>
      </Card>
      {team && participant ? (
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <Card className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{team.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Assignment for {participant.fullName}
                </p>
              </div>
              <Badge>Score {team.score?.totalScore}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {members.map((member) =>
                member ? (
                  <div key={member.id} className="rounded-md border border-border p-4">
                    <div className="font-medium">{member.fullName}</div>
                    <div className="text-sm text-muted-foreground">
                      {member.primaryRole} - {member.experienceLevel}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.technicalSkills.slice(0, 3).map((skill) => (
                        <Badge key={skill}>{skill}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </Card>
          <div className="space-y-6">
            {team.score ? (
              <Card>
                <h2 className="font-semibold">Score breakdown</h2>
                <div className="mt-4 grid gap-2 text-sm">
                  <Score label="Role coverage" value={team.score.roleCoverageScore} />
                  <Score label="Skill coverage" value={team.score.skillCoverageScore} />
                  <Score label="Experience balance" value={team.score.experienceBalanceScore} />
                  <Score label="Interest alignment" value={team.score.interestAlignmentScore} />
                  <Score label="Availability" value={team.score.availabilityCompatibilityScore} />
                  <Score label="Preferences" value={team.score.preferenceSatisfactionScore} />
                  <Score label="Penalty" value={team.score.constraintPenalty} />
                </div>
              </Card>
            ) : null}
            {explanation ? (
              <Card className="space-y-4">
                <div>
                  <h2 className="font-semibold">Why this team?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{explanation.summary}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Suggested direction</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {explanation.suggestedProjectDirection}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Suggested internal roles</h3>
                  <div className="mt-2 grid gap-2">
                    {Object.entries(explanation.suggestedInternalRoles).map(([name, role]) => (
                      <div key={name} className="flex justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm">
                        <span>{name}</span>
                        <span className="text-muted-foreground">{role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      ) : (
        <Card>
          <h2 className="font-semibold">No team assignment found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {!participant
              ? "No participant matches that name, email, or ID."
              : !participant.consentToMatch
                ? `${participant.fullName} did not consent to matching, so they are excluded.`
                : isUnassigned
                  ? `${participant.fullName} is currently unassigned under these settings.`
                  : "This participant was not placed in a generated team."}
          </p>
        </Card>
      )}
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-white px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
