"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, TextArea, TextInput } from "@/components/ui";
import {
  createBlankParticipant,
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

type ListDrafts = Pick<
  Participant,
  | "secondaryRoles"
  | "technicalSkills"
  | "nonTechnicalSkills"
  | "tools"
  | "interests"
  | "preferredTeammates"
  | "blockedTeammates"
>;

const emptyListDrafts: Record<keyof ListDrafts, string> = {
  secondaryRoles: "",
  technicalSkills: "",
  nonTechnicalSkills: "",
  tools: "",
  interests: "",
  preferredTeammates: "",
  blockedTeammates: ""
};

export default function RegisterPage() {
  const router = useRouter();
  const { participants, saveParticipant, loaded } = useHackMatchData();
  const blank = useMemo(() => createBlankParticipant(participants), [participants]);
  const [form, setForm] = useState<Participant>(blank);
  const [listDrafts, setListDrafts] = useState(emptyListDrafts);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Participant>(key: K, value: Participant[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateListDraft(key: keyof ListDrafts, value: string) {
    setListDrafts((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    const participantToSave: Participant = {
      ...form,
      secondaryRoles: splitList(listDrafts.secondaryRoles),
      technicalSkills: splitList(listDrafts.technicalSkills),
      nonTechnicalSkills: splitList(listDrafts.nonTechnicalSkills),
      tools: splitList(listDrafts.tools),
      interests: splitList(listDrafts.interests),
      preferredTeammates: splitList(listDrafts.preferredTeammates),
      blockedTeammates: splitList(listDrafts.blockedTeammates)
    };
    const savedParticipant = saveParticipant(participantToSave);
    writeCurrentParticipantLookup(savedParticipant.accessToken ?? savedParticipant.email);
    setSaved(true);
    setForm(createBlankParticipant([...participants, participantToSave]));
    setListDrafts(emptyListDrafts);
    router.push(`/participant/team?access=${encodeURIComponent(savedParticipant.accessToken ?? savedParticipant.email)}`);
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
          <ListField label="Secondary roles" value={listDrafts.secondaryRoles} onChange={(value) => updateListDraft("secondaryRoles", value)} />
          <ListField label="Technical skills" value={listDrafts.technicalSkills} onChange={(value) => updateListDraft("technicalSkills", value)} />
          <ListField label="Non-technical skills" value={listDrafts.nonTechnicalSkills} onChange={(value) => updateListDraft("nonTechnicalSkills", value)} />
          <ListField label="Tools" value={listDrafts.tools} onChange={(value) => updateListDraft("tools", value)} />
          <ListField label="Interests" value={listDrafts.interests} onChange={(value) => updateListDraft("interests", value)} />
          <ListField label="Preferred teammates" value={listDrafts.preferredTeammates} onChange={(value) => updateListDraft("preferredTeammates", value)} />
          <ListField label="Blocked teammates" value={listDrafts.blockedTeammates} onChange={(value) => updateListDraft("blockedTeammates", value)} />
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

function ListField({
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
      <TextArea
        className="min-h-28"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add one item per line, or separate items with commas"
      />
      <span className="block text-xs font-normal text-muted-foreground">
        Spaces are preserved inside each item.
      </span>
    </label>
  );
}
