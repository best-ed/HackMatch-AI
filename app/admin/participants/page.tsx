"use client";

import { Badge, Card, TextInput } from "@/components/ui";
import { joinList, splitList, useHackMatchData } from "@/lib/local-store";
import type { ExperienceLevel, Participant } from "@/lib/matching/types";

export default function AdminParticipantsPage() {
  const { participants, saveParticipant, deleteParticipant, resetDemoData } = useHackMatchData();

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
            {participants.map((participant) => (
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
                  <TextInput value={joinList(participant.technicalSkills)} onChange={(event) => updateParticipant(participant, "technicalSkills", splitList(event.target.value))} />
                </td>
                <td className="px-4 py-3">
                  <TextInput value={joinList(participant.interests)} onChange={(event) => updateParticipant(participant, "interests", splitList(event.target.value))} />
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
          </tbody>
        </table>
      </Card>
    </div>
  );
}
