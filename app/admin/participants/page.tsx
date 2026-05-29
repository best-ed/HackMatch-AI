"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, TextArea, TextInput } from "@/components/ui";
import { joinListLines, splitList, useHackMatchData } from "@/lib/local-store";
import type { ExperienceLevel, Participant } from "@/lib/matching/types";

export default function AdminParticipantsPage() {
  const { participants, saveParticipant, deleteParticipant, resetDemoData } = useHackMatchData();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState<"all" | ExperienceLevel>("all");
  const [consentFilter, setConsentFilter] = useState<"all" | "matchable" | "excluded">("all");

  const roles = useMemo(
    () => Array.from(new Set(participants.map((participant) => participant.primaryRole).filter(Boolean))).sort(),
    [participants]
  );
  const filteredParticipants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return participants.filter((participant) => {
      const searchableText = [
        participant.id,
        participant.fullName,
        participant.email,
        participant.primaryRole,
        participant.experienceLevel,
        ...participant.technicalSkills,
        ...participant.interests
      ].join(" ").toLowerCase();
      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
      const matchesRole = roleFilter === "all" || participant.primaryRole === roleFilter;
      const matchesExperience = experienceFilter === "all" || participant.experienceLevel === experienceFilter;
      const matchesConsent =
        consentFilter === "all" ||
        (consentFilter === "matchable" && participant.consentToMatch) ||
        (consentFilter === "excluded" && !participant.consentToMatch);
      return matchesQuery && matchesRole && matchesExperience && matchesConsent;
    });
  }, [consentFilter, experienceFilter, participants, query, roleFilter]);
  const matchableCount = participants.filter((participant) => participant.consentToMatch).length;
  const advancedCount = participants.filter((participant) => participant.experienceLevel === "advanced").length;

  function updateParticipant<K extends keyof Participant>(
    participant: Participant,
    key: K,
    value: Participant[K]
  ) {
    saveParticipant({ ...participant, [key]: value });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Participants</h1>
          <p className="mt-2 text-muted-foreground">
            Edit the active participant set used by matching in this browser.
          </p>
        </div>
        <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={resetDemoData}>
          Reset demo data
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Total" value={participants.length} />
        <Metric label="Showing" value={filteredParticipants.length} />
        <Metric label="Matchable" value={matchableCount} />
        <Metric label="Advanced" value={advancedCount} />
      </div>
      <Card className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_auto]">
        <label className="space-y-2 text-sm font-medium">
          <span>Search participants</span>
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, email, role, skill, or interest"
          />
        </label>
        <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter}>
          <option value="all">All roles</option>
          {roles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Experience" value={experienceFilter} onChange={(value) => setExperienceFilter(value as "all" | ExperienceLevel)}>
          <option value="all">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </FilterSelect>
        <FilterSelect label="Consent" value={consentFilter} onChange={(value) => setConsentFilter(value as "all" | "matchable" | "excluded")}>
          <option value="all">All consent</option>
          <option value="matchable">Matchable</option>
          <option value="excluded">Excluded</option>
        </FilterSelect>
        <div className="flex items-end">
          <Button
            className="w-full border border-border bg-white text-foreground hover:bg-muted"
            onClick={() => {
              setQuery("");
              setRoleFilter("all");
              setExperienceFilter("all");
              setConsentFilter("all");
            }}
            type="button"
          >
            Clear
          </Button>
        </div>
      </Card>
      <Card className="table-scroll p-0">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead className="bg-muted text-left">
            <tr>
              {["Name", "Role", "Experience", "Skills", "Interests", "Consent", "Actions"].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.map((participant) => (
              <tr key={participant.id} className="border-t border-border align-top">
                <td className="space-y-2 px-4 py-3">
                  <TextInput value={participant.fullName} onChange={(event) => updateParticipant(participant, "fullName", event.target.value)} />
                  <TextInput value={participant.email} onChange={(event) => updateParticipant(participant, "email", event.target.value)} />
                  <div className="text-xs text-muted-foreground">{participant.id}</div>
                </td>
                <td className="px-4 py-3">
                  <TextInput value={participant.primaryRole} onChange={(event) => updateParticipant(participant, "primaryRole", event.target.value)} />
                </td>
                <td className="px-4 py-3">
                  <select
                    className="w-full rounded-md border border-border bg-white px-3 py-2"
                    value={participant.experienceLevel}
                    onChange={(event) => updateParticipant(participant, "experienceLevel", event.target.value as ExperienceLevel)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <TextArea className="min-h-24" value={joinListLines(participant.technicalSkills)} onChange={(event) => updateParticipant(participant, "technicalSkills", splitList(event.target.value))} />
                </td>
                <td className="px-4 py-3">
                  <TextArea className="min-h-24" value={joinListLines(participant.interests)} onChange={(event) => updateParticipant(participant, "interests", splitList(event.target.value))} />
                </td>
                <td className="space-y-3 px-4 py-3">
                  <Badge className={participant.consentToMatch ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
                    {participant.consentToMatch ? "Matchable" : "Excluded"}
                  </Badge>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={participant.consentToMatch} onChange={(event) => updateParticipant(participant, "consentToMatch", event.target.checked)} />
                    Match
                  </label>
                </td>
                <td className="px-4 py-3">
                  <button className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-rose-700" onClick={() => deleteParticipant(participant.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredParticipants.length === 0 ? (
              <tr className="border-t border-border">
                <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                  No participants match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
      <select
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
