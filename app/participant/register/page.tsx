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
import { validateParticipantRegistration } from "@/lib/participant-validation";

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
  const { participants, saveParticipant, loaded, activeCohort, cohorts } = useHackMatchData();
  const blank = useMemo(() => createBlankParticipant(participants), [participants]);
  const [form, setForm] = useState<Participant>(blank);
  const [listDrafts, setListDrafts] = useState(emptyListDrafts);
  const [saved, setSaved] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  function update<K extends keyof Participant>(key: K, value: Participant[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateListDraft(key: keyof ListDrafts, value: string) {
    setListDrafts((current) => ({ ...current, [key]: value }));
  }

  const participantPreview = useMemo(
    () => buildParticipantFromDrafts(form, listDrafts),
    [form, listDrafts]
  );
  const validation = useMemo(
    () => validateParticipantRegistration(participantPreview, participants),
    [participantPreview, participants]
  );

  function submit() {
    setAttemptedSubmit(true);
    if (validation.errors.length > 0) return;

    const participantToSave = {
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
    setAttemptedSubmit(false);
    setForm(createBlankParticipant([...participants, participantToSave]));
    setListDrafts(emptyListDrafts);
    router.push(`/participant/confirmation?access=${encodeURIComponent(savedParticipant.accessToken ?? savedParticipant.email)}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Participant registration</h1>
        <p className="mt-2 text-muted-foreground">
          Add a participant profile with enough role, skill, consent, and availability data for reliable matching.
        </p>
      </div>
      <Card>
        <form className="grid gap-4 md:grid-cols-2">
          <SectionTitle title="Identity" detail="Basic profile details used by organizers and access-link lookup." />
          <Field label="Full name" value={form.fullName} onChange={(value) => update("fullName", value)} />
          <Field label="Email" value={form.email} onChange={(value) => update("email", value)} />
          <label className="space-y-2 text-sm font-medium">
            <span>Cohort</span>
            <TextInput
              list="registration-cohorts"
              value={form.cohort ?? activeCohort}
              onChange={(event) => update("cohort", event.target.value)}
              placeholder="General, May Hackathon, Workshop A"
            />
            <datalist id="registration-cohorts">
              {cohorts.map((cohort) => <option key={cohort} value={cohort} />)}
            </datalist>
          </label>
          <Field label="Phone" value={form.phone ?? ""} onChange={(value) => update("phone", value)} />
          <Field label="Institution" value={form.institution ?? ""} onChange={(value) => update("institution", value)} />
          <Field label="GitHub URL" value={form.githubUrl ?? ""} onChange={(value) => update("githubUrl", value)} />
          <Field label="LinkedIn URL" value={form.linkedinUrl ?? ""} onChange={(value) => update("linkedinUrl", value)} />
          <Field label="Portfolio URL" value={form.portfolioUrl ?? ""} onChange={(value) => update("portfolioUrl", value)} />
          <SectionTitle title="Matching profile" detail="Roles, skills, and interests drive deterministic team fit." />
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
          <SectionTitle title="Availability and consent" detail="Hard constraints and consent control whether someone can be assigned." />
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
          <div className="space-y-3 rounded-md border border-border bg-muted p-4 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Registration quality</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  These checks protect matching quality before the profile is saved.
                </p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${
                validation.errors.length > 0 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                {validation.errors.length > 0 ? "Needs fixes" : "Ready"}
              </span>
            </div>
            {attemptedSubmit && validation.errors.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-rose-800">
                {validation.errors.map((error) => <li key={error}>{error}</li>)}
              </ul>
            ) : null}
            {validation.warnings.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                {validation.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            ) : null}
          </div>
          <button
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 md:w-fit"
            type="button"
            disabled={!loaded}
            onClick={submit}
          >
            Save registration
          </button>
          {saved ? <p className="self-center text-sm font-medium text-emerald-700">Saved. Opening confirmation.</p> : null}
        </form>
      </Card>
    </div>
  );
}

function buildParticipantFromDrafts(
  form: Participant,
  listDrafts: Record<keyof ListDrafts, string>
): Participant {
  return {
    ...form,
    secondaryRoles: splitList(listDrafts.secondaryRoles),
    technicalSkills: splitList(listDrafts.technicalSkills),
    nonTechnicalSkills: splitList(listDrafts.nonTechnicalSkills),
    tools: splitList(listDrafts.tools),
    interests: splitList(listDrafts.interests),
    preferredTeammates: splitList(listDrafts.preferredTeammates),
    blockedTeammates: splitList(listDrafts.blockedTeammates)
  };
}

function SectionTitle({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border-b border-border pb-2 md:col-span-2">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
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
