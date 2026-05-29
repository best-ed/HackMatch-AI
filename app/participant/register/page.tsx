"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, TextArea, TextInput } from "@/components/ui";
import {
  createBlankParticipant,
  joinList,
  splitList,
  useHackMatchData,
  writeCurrentParticipantLookup
} from "@/lib/local-store";
import type { AvailabilitySlot, ExperienceLevel, Participant } from "@/lib/matching/types";

const availabilitySlots: AvailabilitySlot[] = [
  "weekday_morning",
  "weekday_afternoon",
  "weekday_evening",
  "weekend_morning",
  "weekend_afternoon",
  "weekend_evening"
];

export default function RegisterPage() {
  const router = useRouter();
  const { participants, saveParticipant, loaded } = useHackMatchData();
  const blank = useMemo(() => createBlankParticipant(participants), [participants]);
  const [form, setForm] = useState<Participant>(blank);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Participant>(key: K, value: Participant[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    const savedParticipant = saveParticipant(form);
    writeCurrentParticipantLookup(savedParticipant.email);
    setSaved(true);
    setForm(createBlankParticipant([...participants, form]));
    router.push(`/participant/team?participant=${encodeURIComponent(savedParticipant.email)}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Participant registration</h1>
        <p className="mt-2 text-muted-foreground">
          Add participants into local MVP storage and immediately test matching viability.
        </p>
      </div>
      <Card>
        <form className="grid gap-4 md:grid-cols-2">
          <Field label="Full name" value={form.fullName} onChange={(value) => update("fullName", value)} />
          <Field label="Email" value={form.email} onChange={(value) => update("email", value)} />
          <Field label="Phone" value={form.phone ?? ""} onChange={(value) => update("phone", value)} />
          <Field label="Institution" value={form.institution ?? ""} onChange={(value) => update("institution", value)} />
          <Field label="GitHub URL" value={form.githubUrl ?? ""} onChange={(value) => update("githubUrl", value)} />
          <Field label="LinkedIn URL" value={form.linkedinUrl ?? ""} onChange={(value) => update("linkedinUrl", value)} />
          <Field label="Portfolio URL" value={form.portfolioUrl ?? ""} onChange={(value) => update("portfolioUrl", value)} />
          <label className="space-y-2 text-sm font-medium">
            <span>Experience level</span>
            <select
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              value={form.experienceLevel}
              onChange={(event) => update("experienceLevel", event.target.value as ExperienceLevel)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <Field label="Primary role" value={form.primaryRole} onChange={(value) => update("primaryRole", value)} />
          <Field label="Secondary roles" value={joinList(form.secondaryRoles)} onChange={(value) => update("secondaryRoles", splitList(value))} />
          <Field label="Technical skills" value={joinList(form.technicalSkills)} onChange={(value) => update("technicalSkills", splitList(value))} />
          <Field label="Non-technical skills" value={joinList(form.nonTechnicalSkills)} onChange={(value) => update("nonTechnicalSkills", splitList(value))} />
          <Field label="Tools" value={joinList(form.tools)} onChange={(value) => update("tools", splitList(value))} />
          <Field label="Interests" value={joinList(form.interests)} onChange={(value) => update("interests", splitList(value))} />
          <Field label="Preferred teammates" value={joinList(form.preferredTeammates)} onChange={(value) => update("preferredTeammates", splitList(value))} />
          <Field label="Blocked teammates" value={joinList(form.blockedTeammates)} onChange={(value) => update("blockedTeammates", splitList(value))} />
          <label className="space-y-2 text-sm font-medium md:col-span-2">
            <span>Availability</span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availabilitySlots.map((slot) => (
                <label key={slot} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.availability.includes(slot)}
                    onChange={(event) => {
                      update(
                        "availability",
                        event.target.checked
                          ? [...form.availability, slot]
                          : form.availability.filter((item) => item !== slot)
                      );
                    }}
                  />
                  {slot.replace("_", " ")}
                </label>
              ))}
            </div>
          </label>
          <label className="space-y-2 text-sm font-medium md:col-span-2">
            <span>Project ideas</span>
            <TextArea value={form.projectIdeas ?? ""} onChange={(event) => update("projectIdeas", event.target.value)} />
          </label>
          <label className="space-y-2 text-sm font-medium md:col-span-2">
            <span>Personal statement</span>
            <TextArea value={form.personalStatement ?? ""} onChange={(event) => update("personalStatement", event.target.value)} />
          </label>
          <div className="space-y-3 md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.consentToMatch} onChange={(event) => update("consentToMatch", event.target.checked)} /> I consent to be matched into a team.
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.consentToShareContact} onChange={(event) => update("consentToShareContact", event.target.checked)} /> I consent to share contact details with my team.
            </label>
          </div>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 md:w-fit"
            type="button"
            disabled={!loaded || !form.fullName.trim() || !form.email.trim()}
            onClick={submit}
          >
            Save registration
          </button>
          {saved ? <p className="self-center text-sm font-medium text-emerald-700">Saved. Opening your team page.</p> : null}
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
      <TextInput value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
