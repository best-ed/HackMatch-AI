"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clipboard, EyeOff, LinkIcon, Mail, Phone, ShieldCheck, Users } from "lucide-react";
import { SectionTrail } from "@/components/section-trail";
import { Badge, Button, Card, EmptyState, TextInput } from "@/components/ui";
import { clipboardStatusMessage, copyTextToClipboard } from "@/lib/clipboard";
import {
  readCurrentParticipantLookup,
  useHackMatchData,
  writeCurrentParticipantLookup
} from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";
import type { Participant } from "@/lib/matching/types";
import { buildParticipantStatusChecklist, type ParticipantStatusItem } from "@/lib/participant-status";
import { buildParticipantTeamBrief, formatAvailability } from "@/lib/participant-team-view";

export default function ParticipantTeamPage() {
  const { participants, settings } = useHackMatchData();
  const defaultParticipant = participants.find((item) => item.consentToMatch) ?? participants[0];
  const [lookup, setLookup] = useState(defaultParticipant?.email ?? "");
  const normalizedLookup = normalizeLookupValue(lookup);
  const participant = normalizedLookup
    ? participants.find((item) => {
    const searchableValues = [
      item.id,
      item.accessToken ?? "",
      item.fullName,
      item.email,
      item.email.split("@")[0]
    ];
    return searchableValues.some((value) =>
      normalizeLookupValue(value).includes(normalizedLookup)
    );
  })
    : undefined;
  const teamParticipants = participant
    ? participants.filter((item) => (item.cohort ?? "General") === (participant.cohort ?? "General"))
    : participants;
  const result = useMemo(
    () => generateTeams(teamParticipants, settings),
    [teamParticipants, settings]
  );
  const team = participant?.consentToMatch
    ? result.teams.find((candidate) => candidate.participantIds.includes(participant.id))
    : undefined;
  const members = team
    ? team.participantIds
      .map((id) => participants.find((p) => p.id === id))
      .filter((member): member is Participant => Boolean(member))
    : [];
  const explanation = result.explanations.find((item) => item.teamId === team?.id);
  const brief = buildParticipantTeamBrief(members, explanation, participant?.id);
  const isUnassigned = participant
    ? result.unassignedParticipants.includes(participant.id)
    : false;
  const statusChecklist = buildParticipantStatusChecklist({ participant, team });
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const participantLookup = params.get("access") ?? params.get("participant");
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

  async function copyTeamBrief() {
    if (!team || !participant) return;
    const text = [
      `${team.name} for ${participant.fullName}`,
      `Members: ${members.map((member) => `${member.fullName} (${member.primaryRole})`).join(", ")}`,
      explanation?.summary ? `Why this team: ${explanation.summary}` : "",
      explanation?.suggestedProjectDirection ? `Project direction: ${explanation.suggestedProjectDirection}` : "",
      brief.nextSteps.length ? `Next steps: ${brief.nextSteps.join(" ")}` : ""
    ].filter(Boolean).join("\n");
    const result = await copyTextToClipboard(text);
    setCopyStatus(clipboardStatusMessage(result, "Team brief copied."));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionTrail items={[{ href: "/participant", label: "Participant" }, { label: "My team" }]} />
          <h1 className="text-3xl font-bold tracking-tight">My team</h1>
          <p className="mt-2 text-muted-foreground">
            Open your access link or enter a participant name, email, ID, or access token.
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
            placeholder="Access token, Maya Patel, maya.patel@example.com, or p02"
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
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{team.name}</h2>
                  <Badge>{participant.cohort ?? "General"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Assignment for {participant.fullName}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={scoreBadgeClass(team.score?.totalScore ?? 0)}>Score {team.score?.totalScore}</Badge>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold"
                  onClick={() => void copyTeamBrief()}
                  type="button"
                >
                  <Clipboard size={16} />
                  Copy brief
                </button>
              </div>
            </div>
            {copyStatus ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
                {copyStatus}
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryMetric icon={<Users size={16} />} label="Team size" value={members.length} />
              <SummaryMetric icon={<CheckCircle2 size={16} />} label="Shared interests" value={brief.sharedInterests.length || "Mixed"} />
              <SummaryMetric icon={<CalendarClock size={16} />} label="Overlap" value={brief.sharedAvailability.length || "Review"} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {members.map((member) =>
                member ? (
                  <div key={member.id} className="rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{member.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.primaryRole} - {member.experienceLevel}
                        </div>
                      </div>
                      {member.id === participant.id ? <Badge className="bg-sky-100 text-sky-800">You</Badge> : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {explanation?.suggestedInternalRoles[member.fullName] ?? "Team contributor"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.technicalSkills.slice(0, 3).map((skill) => (
                        <Badge key={skill}>{skill}</Badge>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {member.availability.slice(0, 2).map(formatAvailability).join(", ") || "Availability not listed"}
                    </div>
                  </div>
                ) : null
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InfoPanel title="Shared interests" items={brief.sharedInterests} fallback="No single interest is shared by every member yet." />
              <InfoPanel title="First coordination windows" items={brief.sharedAvailability.map(formatAvailability)} fallback="No full-team availability overlap found." />
            </div>
          </Card>
          <div className="space-y-6">
            <Card className="space-y-4">
              <div>
                <h2 className="font-semibold">Suggested next steps</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use this as a starting handoff, not a final plan.
                </p>
              </div>
              <div className="grid gap-2">
                {brief.nextSteps.map((step, index) => (
                  <div key={step} className="flex gap-3 rounded-md border border-border bg-white p-3 text-sm">
                    <span className="font-semibold text-primary">{index + 1}</span>
                    <span className="text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </Card>
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
            <Card className="space-y-4">
              <div>
                <h2 className="font-semibold">Assignment checklist</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quick status for your profile, consent, assignment, and contact handoff.
                </p>
              </div>
              <div className="grid gap-2">
                {statusChecklist.map((item) => (
                  <StatusChecklistItem item={item} key={item.id} />
                ))}
              </div>
            </Card>
            <Card className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Privacy summary</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This handoff only reveals contact details that teammates consented to share.
                  </p>
                </div>
                <Badge className={brief.contactPrivacy.hiddenCount ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
                  {brief.contactPrivacy.visibleCount}/{brief.contactPrivacy.totalCount} visible
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <PrivacyMetric
                  icon={<ShieldCheck size={16} />}
                  label="Your sharing"
                  value={brief.contactPrivacy.viewerCanShareContact ? "On" : "Off"}
                />
                <PrivacyMetric
                  icon={<EyeOff size={16} />}
                  label="Hidden records"
                  value={brief.contactPrivacy.hiddenCount}
                />
              </div>
              <div className="rounded-md border border-border bg-white p-3 text-sm">
                <div className="font-semibold">{brief.contactPrivacy.summary}</div>
                <p className="mt-2 text-muted-foreground">{brief.contactPrivacy.viewerDetail}</p>
                {brief.contactPrivacy.hiddenNames.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Hidden by consent: {brief.contactPrivacy.hiddenNames.join(", ")}
                  </p>
                ) : null}
              </div>
            </Card>
            {explanation ? (
              <Card className="space-y-4">
                <div>
                  <h2 className="font-semibold">Why this team?</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{explanation.summary}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Strengths</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {explanation.strengths.map((strength) => <li key={strength}>{strength}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Watch points</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {explanation.weaknesses.map((weakness) => <li key={weakness}>{weakness}</li>)}
                  </ul>
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
            <Card className="space-y-4">
              <div>
                <h2 className="font-semibold">Contact handoff</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contact cards are generated from consent flags. Hidden teammates are still assigned to your team; only their contact details are withheld.
                </p>
              </div>
              {brief.visibleContacts.length ? (
                <div className="grid gap-3">
                  {brief.visibleContacts.map((contact) => (
                    <div key={contact.id} className="rounded-md border border-border bg-white p-3 text-sm">
                      <div className="font-semibold">{contact.name}</div>
                      <div className="mt-2 grid gap-2 text-muted-foreground">
                        {contact.email ? <ContactLine icon={<Mail size={14} />} value={contact.email} /> : null}
                        {contact.phone ? <ContactLine icon={<Phone size={14} />} value={contact.phone} /> : null}
                        {contact.links.map((link) => (
                          <a key={link.url} className="inline-flex items-center gap-2 text-primary" href={link.url} rel="noreferrer" target="_blank">
                            <LinkIcon size={14} />
                            {link.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No contact details are shareable yet. Ask the organizer to coordinate introductions.
                </p>
              )}
            </Card>
            {brief.warnings.length ? (
              <Card className="space-y-3 border-amber-200 bg-amber-50">
                <div className="flex items-center gap-2 font-semibold text-amber-900">
                  <AlertTriangle size={18} />
                  Warnings
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">
                  {brief.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </Card>
            ) : null}
          </div>
        </div>
      ) : (
        <EmptyState
          action={
            <Button
              className="w-full sm:w-auto"
              onClick={() => updateLookup(defaultParticipant?.email ?? "")}
              type="button"
            >
              Use demo participant
            </Button>
          }
          description={`${!participant
            ? "No participant matches that access token, name, email, or ID."
            : !participant.consentToMatch
              ? `${participant.fullName} did not consent to matching, so they are excluded.`
              : isUnassigned
                ? `${participant.fullName} is currently unassigned under these settings.`
                : "This participant was not placed in a generated team."
          } Try the exact access token from your confirmation page, or wait for the organizer to generate teams for your cohort.`}
          icon={<AlertTriangle size={20} />}
          title="No team assignment found"
        />
      )}
      {!team ? (
        <Card className="space-y-4">
          <div>
            <h2 className="font-semibold">Assignment checklist</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this to see what is missing before a team assignment appears.
            </p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {statusChecklist.map((item) => (
              <StatusChecklistItem item={item} key={item.id} />
            ))}
          </div>
        </Card>
      ) : null}
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

function SummaryMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="text-primary">{icon}</div>
      <div className="mt-2 text-xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function PrivacyMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-white p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}

function InfoPanel({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="font-semibold">{title}</div>
      {items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => <Badge key={item}>{item}</Badge>)}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{fallback}</p>
      )}
    </div>
  );
}

function ContactLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      {icon}
      {value}
    </div>
  );
}

function StatusChecklistItem({ item }: { item: ParticipantStatusItem }) {
  return (
    <div className="rounded-md border border-border bg-white p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">{item.label}</div>
        <Badge className={statusBadgeClass(item.status)}>{item.status}</Badge>
      </div>
      <p className="mt-2 text-muted-foreground">{item.detail}</p>
    </div>
  );
}

function scoreBadgeClass(score: number) {
  if (score >= 85) return "bg-emerald-100 text-emerald-800";
  if (score >= 75) return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function statusBadgeClass(status: ParticipantStatusItem["status"]) {
  if (status === "complete") return "bg-emerald-100 text-emerald-800";
  if (status === "warning") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-800";
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
