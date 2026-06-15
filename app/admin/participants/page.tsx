"use client";

import { useMemo, useState } from "react";
import { Eye, LinkIcon, SearchX, X } from "lucide-react";
import {
  ParticipantDuplicateReviewPanel,
  ParticipantIntakeQualityPanel,
  ParticipantLinkSecurityPanel,
  ParticipantPrivacyAuditPanel
} from "@/components/admin-participant-audit-panels";
import { AdminDataLoadNotice } from "@/components/admin-data-load-notice";
import { AdminPersistenceStatus } from "@/components/admin-persistence-status";
import { SectionTrail } from "@/components/section-trail";
import { Badge, Button, Card, EmptyState, TextArea, TextInput } from "@/components/ui";
import {
  accessTokenRotationMessage,
  buildAccessTokenRotationPreview
} from "@/lib/access-token-rotation";
import { hackMatchCsvFilename, participantImportTemplateCsv, participantLinksToCsv, participantsToCsv } from "@/lib/export";
import { createUniqueParticipantAccessToken, joinListLines, splitList, useHackMatchData } from "@/lib/local-store";
import { generateTeams } from "@/lib/matching/algorithm";
import type { ExperienceLevel, Participant } from "@/lib/matching/types";
import {
  applyParticipantBulkAction,
  participantBulkActionLabel,
  type ParticipantBulkAction
} from "@/lib/participant-bulk-actions";
import { evaluateParticipantIntake } from "@/lib/participant-intake";
import { findParticipantDuplicates } from "@/lib/participant-duplicates";
import { buildParticipantLinkAudit } from "@/lib/participant-link-audit";
import {
  createImportRollbackSnapshot,
  summarizeImportRollback,
  type ParticipantImportRollbackSnapshot
} from "@/lib/participant-import-rollback";
import { planParticipantCsvImport, type ParticipantImportMode } from "@/lib/participant-import";
import {
  duplicateParticipantIdsFromGroups,
  participantMatchesReadinessFilter,
  type ParticipantReadinessFilter
} from "@/lib/participant-readiness-filter";
import { buildPrivacyAudit } from "@/lib/privacy-audit";
import { validateParticipantRegistration } from "@/lib/participant-validation";

export default function AdminParticipantsPage() {
  const {
    participants,
    setParticipants,
    saveParticipant,
    deleteParticipant,
    resetDemoData,
    activeCohort,
    setActiveCohort,
    cohorts,
    cohortParticipants,
    settings,
    loaded,
    persistenceMode,
    persistenceWarning
  } = useHackMatchData();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState<"all" | ExperienceLevel>("all");
  const [consentFilter, setConsentFilter] = useState<"all" | "matchable" | "excluded">("all");
  const [readinessFilter, setReadinessFilter] = useState<ParticipantReadinessFilter>("all");
  const [linkRiskOnly, setLinkRiskOnly] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [importCsv, setImportCsv] = useState("");
  const [importMode, setImportMode] = useState<ParticipantImportMode>("skip");
  const [importStatus, setImportStatus] = useState("");
  const [lastImportRollback, setLastImportRollback] = useState<ParticipantImportRollbackSnapshot | undefined>();
  const [linkStatus, setLinkStatus] = useState("");
  const [pendingTokenRotationId, setPendingTokenRotationId] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [bulkAction, setBulkAction] = useState<ParticipantBulkAction>("move-cohort");
  const [bulkCohort, setBulkCohort] = useState(activeCohort);
  const [bulkStatus, setBulkStatus] = useState("");

  const roles = useMemo(
    () => Array.from(new Set(participants.map((participant) => participant.primaryRole).filter(Boolean))).sort(),
    [participants]
  );
  const intakeSummary = useMemo(() => evaluateParticipantIntake(participants), [participants]);
  const generatedResult = useMemo(
    () => generateTeams(cohortParticipants, settings),
    [cohortParticipants, settings]
  );
  const privacyAudit = useMemo(
    () => buildPrivacyAudit({ participants: cohortParticipants, result: generatedResult }),
    [cohortParticipants, generatedResult]
  );
  const linkAudit = useMemo(() => buildParticipantLinkAudit(participants), [participants]);
  const linkRiskParticipantIds = useMemo(() => new Set(linkAudit.riskParticipantIds), [linkAudit.riskParticipantIds]);
  const duplicateGroups = useMemo(() => findParticipantDuplicates(participants), [participants]);
  const duplicateParticipantIds = useMemo(() => duplicateParticipantIdsFromGroups(duplicateGroups), [duplicateGroups]);
  const filteredParticipants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return participants.filter((participant) => {
      const searchableText = [
        participant.id,
        participant.accessToken ?? "",
        participant.cohort ?? "",
        participant.fullName,
        participant.email,
        participant.phone ?? "",
        participant.institution ?? "",
        participant.githubUrl ?? "",
        participant.linkedinUrl ?? "",
        participant.portfolioUrl ?? "",
        participant.primaryRole,
        participant.experienceLevel,
        ...participant.secondaryRoles,
        ...participant.technicalSkills,
        ...participant.nonTechnicalSkills,
        ...participant.tools,
        ...participant.interests,
        participant.projectIdeas ?? "",
        ...participant.preferredTeammates,
        ...participant.blockedTeammates,
        ...participant.availability,
        participant.personalStatement ?? ""
      ].join(" ").toLowerCase();
      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
      const matchesRole = roleFilter === "all" || participant.primaryRole === roleFilter;
      const matchesExperience = experienceFilter === "all" || participant.experienceLevel === experienceFilter;
      const matchesConsent =
        consentFilter === "all" ||
        (consentFilter === "matchable" && participant.consentToMatch) ||
        (consentFilter === "excluded" && !participant.consentToMatch);
      const matchesReadiness = participantMatchesReadinessFilter({
        participant,
        participants,
        duplicateParticipantIds,
        filter: readinessFilter
      });
      const matchesLinkRisk = !linkRiskOnly || linkRiskParticipantIds.has(participant.id);
      return matchesQuery && matchesRole && matchesExperience && matchesConsent && matchesReadiness && matchesLinkRisk;
    });
  }, [consentFilter, duplicateParticipantIds, experienceFilter, linkRiskOnly, linkRiskParticipantIds, participants, query, readinessFilter, roleFilter]);
  const selectedParticipant = participants.find((participant) => participant.id === selectedParticipantId);
  const matchableCount = participants.filter((participant) => participant.consentToMatch).length;
  const advancedCount = participants.filter((participant) => participant.experienceLevel === "advanced").length;
  const importPlan = useMemo(() => {
    if (!importCsv.trim()) return null;
    return planParticipantCsvImport({
      csv: importCsv,
      existingParticipants: participants,
      activeCohort,
      mode: importMode
    });
  }, [activeCohort, importCsv, importMode, participants]);

  function updateParticipant<K extends keyof Participant>(
    participant: Participant,
    key: K,
    value: Participant[K]
  ) {
    saveParticipant({ ...participant, [key]: value });
  }

  function downloadParticipantsCsv(scope: "all" | "filtered") {
    const exportParticipants = scope === "all" ? participants : filteredParticipants;
    const csv = participantsToCsv(exportParticipants);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const filename = hackMatchCsvFilename({ cohort: activeCohort, kind: "participants", scope });
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportStatus(`Exported ${exportParticipants.length} participant${exportParticipants.length === 1 ? "" : "s"} to ${filename}.`);
  }

  function downloadAccessLinksCsv(scope: "all" | "filtered") {
    if (typeof window === "undefined") return;
    const exportParticipants = scope === "all" ? participants : filteredParticipants;
    const csv = participantLinksToCsv(exportParticipants, window.location.origin);
    downloadCsvBlob(
      csv,
      hackMatchCsvFilename({ cohort: activeCohort, kind: "access-links", scope })
    );
    setLinkStatus(`Exported ${exportParticipants.length} access link${exportParticipants.length === 1 ? "" : "s"}.`);
  }

  function downloadImportTemplate() {
    const filename = hackMatchCsvFilename({ cohort: activeCohort, kind: "participant-import-template" });
    downloadCsvBlob(participantImportTemplateCsv(), filename);
    setImportStatus(`Downloaded ${filename}.`);
  }

  async function copyFilteredAccessLinks() {
    if (typeof window === "undefined") return;
    const links = filteredParticipants
      .filter((participant) => participant.accessToken)
      .map((participant) => {
        const url = new URL(`/participant/team?access=${participant.accessToken}`, window.location.origin);
        return `${participant.fullName}: ${url.toString()}`;
      });
    await navigator.clipboard?.writeText(links.join("\n"));
    setLinkStatus(`Copied ${links.length} filtered access link${links.length === 1 ? "" : "s"}.`);
  }

  function regenerateAccessToken(participant: Participant) {
    if (pendingTokenRotationId !== participant.id) {
      const preview = buildAccessTokenRotationPreview(participant);
      setPendingTokenRotationId(participant.id);
      setLinkStatus(`${preview.warning} Confirm rotation for ${preview.participantName} (${preview.oldTokenLabel}).`);
      return;
    }

    const oldToken = participant.accessToken;
    const nextToken = createUniqueParticipantAccessToken(participants);
    saveParticipant({ ...participant, accessToken: nextToken });
    setPendingTokenRotationId("");
    setLinkStatus(accessTokenRotationMessage({ participant, oldToken, newToken: nextToken }));
  }

  function cancelTokenRotation(participant: Participant) {
    setPendingTokenRotationId("");
    setLinkStatus(`Token rotation cancelled for ${participant.fullName || participant.email || participant.id}.`);
  }

  function applyFilteredBulkAction() {
    const filteredIds = filteredParticipants.map((participant) => participant.id);
    const result = applyParticipantBulkAction({
      action: bulkAction,
      cohort: bulkCohort,
      participantIds: filteredIds,
      participants
    });

    if (result.affectedCount === 0) {
      setBulkStatus("No participant records changed for the current filter.");
      return;
    }

    setParticipants(result.participants);
    setBulkStatus(
      `${participantBulkActionLabel(bulkAction)} updated ${result.affectedCount} filtered participant${result.affectedCount === 1 ? "" : "s"}.`
    );
  }

  function handleCsvFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportCsv(String(reader.result ?? ""));
      setImportStatus("");
    };
    reader.readAsText(file);
  }

  function applyCsvImport() {
    if (!importPlan || importPlan.errors.length > 0) return;
    const rollback = createImportRollbackSnapshot({
      beforeParticipants: participants,
      afterCount: importPlan.participants.length,
      createdCount: importPlan.createdCount,
      updatedCount: importPlan.updatedCount,
      skippedCount: importPlan.skippedCount
    });
    setParticipants(importPlan.participants);
    setLastImportRollback(rollback);
    setImportStatus(
      `Imported ${importPlan.createdCount} new participant${importPlan.createdCount === 1 ? "" : "s"}${
        importPlan.updatedCount ? ` and updated ${importPlan.updatedCount}` : ""
      }${importPlan.skippedCount ? `; skipped ${importPlan.skippedCount} duplicate${importPlan.skippedCount === 1 ? "" : "s"}` : ""}.`
    );
    setImportCsv("");
  }

  function rollbackLastImport() {
    if (!lastImportRollback) return;
    setParticipants(lastImportRollback.beforeParticipants);
    setImportStatus(`Rolled back last import from ${lastImportRollback.afterCount} to ${lastImportRollback.beforeParticipants.length} participant${lastImportRollback.beforeParticipants.length === 1 ? "" : "s"}.`);
    setLastImportRollback(undefined);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionTrail items={[{ href: "/admin", label: "Admin" }, { label: "Directory" }]} />
          <h1 className="text-3xl font-bold tracking-tight">Participant directory</h1>
          <p className="mt-2 text-muted-foreground">
            Search, edit, import, export, and manage access links for participant records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={() => downloadParticipantsCsv("filtered")}>
            Export filtered CSV
          </button>
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={() => downloadParticipantsCsv("all")}>
            Export all CSV
          </button>
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={resetDemoData}>
            Reset demo data
          </button>
        </div>
      </div>
      {exportStatus ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
          {exportStatus}
        </div>
      ) : null}
      {linkStatus ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800" role="status">
          {linkStatus}
        </div>
      ) : null}
      <AdminPersistenceStatus
        mode={persistenceMode}
        warning={persistenceWarning}
        detail="Participant edits, imports, access tokens, and cohorts are stored in this browser until Supabase env vars are configured."
      />
      <AdminDataLoadNotice loaded={loaded} label="participant directory" />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Total" value={participants.length} />
        <Metric label="Showing" value={filteredParticipants.length} />
        <Metric label="Matchable" value={matchableCount} />
        <Metric label="Advanced" value={advancedCount} />
      </div>
      <ParticipantPrivacyAuditPanel
        activeCohort={activeCohort}
        audit={privacyAudit}
        consentFilter={consentFilter}
        onSetConsentFilter={setConsentFilter}
        onSetReadinessAll={() => setReadinessFilter("all")}
      />
      <ParticipantLinkSecurityPanel
        audit={linkAudit}
        linkRiskOnly={linkRiskOnly}
        onSetLinkRiskOnly={setLinkRiskOnly}
      />
      <ParticipantIntakeQualityPanel
        duplicateCount={duplicateParticipantIds.size}
        onSetReadinessFilter={setReadinessFilter}
        readinessFilter={readinessFilter}
        summary={intakeSummary}
      />
      <ParticipantDuplicateReviewPanel groups={duplicateGroups} />
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
        <label className="space-y-2 text-sm font-medium lg:col-span-2">
          <span>Active matching cohort</span>
          <div className="flex gap-2">
            <TextInput
              list="admin-cohorts"
              value={activeCohort}
              onChange={(event) => setActiveCohort(event.target.value)}
              placeholder="General"
            />
            <datalist id="admin-cohorts">
              {cohorts.map((cohort) => <option key={cohort} value={cohort} />)}
            </datalist>
          </div>
        </label>
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
              setReadinessFilter("all");
              setLinkRiskOnly(false);
            }}
            type="button"
          >
            Clear
          </Button>
        </div>
      </Card>
      <Card className="space-y-4 border-primary/20 bg-emerald-50/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Filtered batch review</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Apply one organizer review action to the {filteredParticipants.length} participant{filteredParticipants.length === 1 ? "" : "s"} currently in view.
            </p>
          </div>
          <Badge className="bg-white text-primary">{filteredParticipants.length} selected by filters</Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-[220px_1fr_auto]">
          <FilterSelect label="Batch action" value={bulkAction} onChange={(value) => setBulkAction(value as ParticipantBulkAction)}>
            <option value="move-cohort">Move to cohort</option>
            <option value="mark-matchable">Mark matchable</option>
            <option value="mark-excluded">Exclude from matching</option>
            <option value="allow-contact">Allow contact sharing</option>
            <option value="hide-contact">Hide contact sharing</option>
          </FilterSelect>
          <label className="space-y-2 text-sm font-medium">
            <span>Target cohort</span>
            <TextInput
              disabled={bulkAction !== "move-cohort"}
              list="bulk-cohorts"
              onChange={(event) => setBulkCohort(event.target.value)}
              placeholder="General, May Hackathon, Workshop A"
              value={bulkCohort}
            />
            <datalist id="bulk-cohorts">
              {cohorts.map((cohort) => <option key={cohort} value={cohort} />)}
            </datalist>
          </label>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={filteredParticipants.length === 0 || (bulkAction === "move-cohort" && !bulkCohort.trim())}
              onClick={applyFilteredBulkAction}
              type="button"
            >
              Apply to filtered
            </Button>
          </div>
        </div>
        {bulkStatus ? (
          <div className="rounded-md border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800" role="status">
            {bulkStatus}
          </div>
        ) : null}
      </Card>
      {selectedParticipant ? (
        <ParticipantDetailPanel
          onClose={() => setSelectedParticipantId("")}
          onCopyLink={() => {
            copyAccessLink(selectedParticipant);
            setLinkStatus(`Copied access link for ${selectedParticipant.fullName}.`);
          }}
          onUpdate={(key, value) => updateParticipant(selectedParticipant, key, value)}
          participant={selectedParticipant}
          validation={validateParticipantRegistration(selectedParticipant, participants)}
        />
      ) : null}
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Access link management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Copy or export participant team links for the current filtered view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={() => void copyFilteredAccessLinks()}>
            Copy filtered links
          </button>
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={() => downloadAccessLinksCsv("filtered")}>
            Export filtered links
          </button>
          <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={() => downloadAccessLinksCsv("all")}>
            Export all links
          </button>
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Import participants CSV</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload an exported HackMatch CSV or paste matching columns to preview before saving.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold" onClick={downloadImportTemplate} type="button">
              Download template
            </button>
            <label className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold">
              Choose CSV
              <input
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => handleCsvFile(event.target.files?.[0])}
                type="file"
              />
            </label>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <label className="space-y-2 text-sm font-medium">
            <span>CSV contents</span>
            <TextArea
              className="min-h-32 font-mono text-xs"
              onChange={(event) => {
                setImportCsv(event.target.value);
                setImportStatus("");
              }}
              placeholder="Paste participant CSV here"
              value={importCsv}
            />
          </label>
          <div className="space-y-3">
            <FilterSelect label="Duplicate handling" value={importMode} onChange={(value) => setImportMode(value as ParticipantImportMode)}>
              <option value="skip">Skip duplicates</option>
              <option value="update">Update duplicates</option>
            </FilterSelect>
            {importPlan ? (
              <div className="rounded-md border border-border bg-muted p-3 text-sm">
                <div className="font-semibold">Preview</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                  <PreviewMetric label="New" value={importPlan.createdCount} />
                  <PreviewMetric label="Updated" value={importPlan.updatedCount} />
                  <PreviewMetric label="Skipped" value={importPlan.skippedCount} />
                  <PreviewMetric label="Invalid" value={importPlan.invalidCount} />
                </div>
              </div>
            ) : null}
            <Button
              className="w-full"
              disabled={!importPlan || importPlan.errors.length > 0 || (importPlan.createdCount + importPlan.updatedCount === 0)}
              onClick={applyCsvImport}
              type="button"
            >
              Import previewed rows
            </Button>
            {importCsv ? (
              <Button
                className="w-full border border-border bg-white text-foreground hover:bg-muted"
                onClick={() => {
                  setImportCsv("");
                  setImportStatus("");
                }}
                type="button"
              >
                Clear import
              </Button>
            ) : null}
          </div>
        </div>
        {importPlan?.warnings.length ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {importPlan.warnings.join(" ")}
          </div>
        ) : null}
        {importPlan?.rowPreviews.length ? (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="bg-muted px-4 py-3 text-sm font-semibold">Row preview</div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="bg-white text-left">
                  <tr>
                    {["Row", "Action", "Participant", "Notes"].map((heading) => (
                      <th key={heading} className="border-t border-border px-4 py-2 font-semibold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPlan.rowPreviews.map((row) => (
                    <tr key={row.rowNumber} className="border-t border-border align-top">
                      <td className="px-4 py-3">{row.rowNumber}</td>
                      <td className="px-4 py-3">
                        <Badge className={importActionClass(row.action)}>{row.action}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.fullName || "Missing name"}</div>
                        <div className="text-xs text-muted-foreground">{row.email || "Missing email"}</div>
                        {row.duplicateName ? (
                          <div className="mt-1 text-xs text-muted-foreground">Duplicate: {row.duplicateName}</div>
                        ) : null}
                      </td>
                      <td className="space-y-1 px-4 py-3">
                        {row.errors.map((error) => (
                          <div key={error} className="text-xs font-medium text-rose-700">{error}</div>
                        ))}
                        {row.warnings.map((warning) => (
                          <div key={warning} className="text-xs text-amber-700">{warning}</div>
                        ))}
                        {row.errors.length === 0 && row.warnings.length === 0 ? (
                          <div className="text-xs text-muted-foreground">Ready</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
        {importPlan?.errors.length ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {importPlan.errors.join(" ")}
          </div>
        ) : null}
        {importStatus ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800" role="status">
            {importStatus}
          </div>
        ) : null}
        {lastImportRollback ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <div>
              <div className="font-semibold">Last import can be rolled back</div>
              <p className="mt-1">{summarizeImportRollback(lastImportRollback)}</p>
            </div>
            <button
              className="rounded-md border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-900"
              onClick={rollbackLastImport}
              type="button"
            >
              Roll back last import
            </button>
          </div>
        ) : null}
      </Card>
      <Card className="table-scroll p-0">
        <table className="w-full min-w-[1260px] border-collapse text-sm">
          <thead className="bg-muted text-left">
            <tr>
              {["Name", "Cohort", "Role", "Experience", "Skills", "Interests", "Consent", "Access", "Actions"].map((heading) => (
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
                  <TextInput value={participant.cohort ?? "General"} onChange={(event) => updateParticipant(participant, "cohort", event.target.value)} />
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
                <td className="space-y-2 px-4 py-3">
                  <a
                    className="block rounded-md border border-border bg-white px-3 py-2 text-center text-sm font-semibold text-primary"
                    href={participant.accessToken ? `/participant/team?access=${encodeURIComponent(participant.accessToken)}` : "/participant/team"}
                  >
                    Open team link
                  </a>
                  <button
                    className="w-full rounded-md border border-border px-3 py-2 text-sm font-semibold"
                    onClick={() => copyAccessLink(participant)}
                    type="button"
                  >
                    Copy link
                  </button>
                  <button
                    className={`w-full rounded-md border px-3 py-2 text-sm font-semibold ${
                      pendingTokenRotationId === participant.id
                        ? "border-amber-300 bg-amber-50 text-amber-900"
                        : "border-border text-amber-800"
                    }`}
                    onClick={() => regenerateAccessToken(participant)}
                    type="button"
                  >
                    {pendingTokenRotationId === participant.id ? "Confirm rotation" : "Regenerate token"}
                  </button>
                  {pendingTokenRotationId === participant.id ? (
                    <button
                      className="w-full rounded-md border border-border px-3 py-2 text-sm font-semibold"
                      onClick={() => cancelTokenRotation(participant)}
                      type="button"
                    >
                      Cancel rotation
                    </button>
                  ) : null}
                  <div className="break-all text-xs text-muted-foreground">
                    {participant.accessToken ? formatAccessToken(participant.accessToken) : "Token will be generated on next save"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="grid gap-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-semibold"
                      onClick={() => setSelectedParticipantId(participant.id)}
                      type="button"
                    >
                      <Eye size={15} />
                      Details
                    </button>
                    <button className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-rose-700" onClick={() => deleteParticipant(participant.id)}>
                    Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredParticipants.length === 0 ? (
              <tr className="border-t border-border">
                <td className="px-4 py-8" colSpan={9}>
                  <EmptyState
                    description="Adjust the search, role, experience, or consent filters to bring participants back into view."
                    icon={<SearchX size={20} />}
                    title="No participants match these filters"
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ParticipantDetailPanel({
  participant,
  validation,
  onClose,
  onCopyLink,
  onUpdate
}: {
  participant: Participant;
  validation: { errors: string[]; warnings: string[] };
  onClose: () => void;
  onCopyLink: () => void;
  onUpdate: <K extends keyof Participant>(key: K, value: Participant[K]) => void;
}) {
  const readiness = validation.errors.length
    ? "Needs fixes"
    : validation.warnings.length
      ? "Needs review"
      : "Ready";
  return (
    <Card className="space-y-5 border-primary/30 bg-emerald-50/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{participant.fullName || "Unnamed participant"}</h2>
            <Badge className={participant.consentToMatch ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
              {participant.consentToMatch ? "Matchable" : "Excluded"}
            </Badge>
            <Badge className={readiness === "Ready" ? "bg-emerald-100 text-emerald-800" : readiness === "Needs review" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}>
              {readiness}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {participant.primaryRole} - {participant.experienceLevel} - {participant.cohort ?? "General"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold"
            onClick={onCopyLink}
            type="button"
          >
            <LinkIcon size={15} />
            Copy link
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            <X size={15} />
            Close
          </button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-border bg-white p-4">
          <h3 className="font-semibold">Identity and links</h3>
          <div className="mt-3 grid gap-2 text-sm">
            <DetailRow label="Email" value={participant.email} />
            <DetailRow label="Phone" value={participant.phone || "Not provided"} />
            <DetailRow label="Institution" value={participant.institution || "Not provided"} />
            <DetailRow label="Access token" value={participant.accessToken || "Not generated"} />
            <DetailLink label="GitHub" value={participant.githubUrl} />
            <DetailLink label="LinkedIn" value={participant.linkedinUrl} />
            <DetailLink label="Portfolio" value={participant.portfolioUrl} />
          </div>
        </div>
        <div className="rounded-md border border-border bg-white p-4">
          <h3 className="font-semibold">Readiness notes</h3>
          <div className="mt-3 grid gap-2">
            {validation.errors.map((error) => (
              <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800" key={error}>{error}</div>
            ))}
            {validation.warnings.map((warning) => (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800" key={warning}>{warning}</div>
            ))}
            {validation.errors.length === 0 && validation.warnings.length === 0 ? (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Profile has enough signal for matching.
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-white p-4">
          <h3 className="font-semibold">Edit identity</h3>
          <div className="mt-3 grid gap-3">
            <label className="space-y-2 text-sm font-medium">
              <span>Full name</span>
              <TextInput value={participant.fullName} onChange={(event) => onUpdate("fullName", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Email</span>
              <TextInput value={participant.email} onChange={(event) => onUpdate("email", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Cohort</span>
              <TextInput value={participant.cohort ?? "General"} onChange={(event) => onUpdate("cohort", event.target.value)} />
            </label>
          </div>
        </div>
        <div className="rounded-md border border-border bg-white p-4">
          <h3 className="font-semibold">Edit matching signal</h3>
          <div className="mt-3 grid gap-3">
            <label className="space-y-2 text-sm font-medium">
              <span>Primary role</span>
              <TextInput value={participant.primaryRole} onChange={(event) => onUpdate("primaryRole", event.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Experience</span>
              <select
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-4"
                onChange={(event) => onUpdate("experienceLevel", event.target.value as ExperienceLevel)}
                value={participant.experienceLevel}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Technical skills</span>
              <TextArea className="min-h-20" value={joinListLines(participant.technicalSkills)} onChange={(event) => onUpdate("technicalSkills", splitList(event.target.value))} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Interests</span>
              <TextArea className="min-h-20" value={joinListLines(participant.interests)} onChange={(event) => onUpdate("interests", splitList(event.target.value))} />
            </label>
          </div>
        </div>
        <div className="rounded-md border border-border bg-white p-4">
          <h3 className="font-semibold">Edit teammate constraints</h3>
          <div className="mt-3 grid gap-3">
            <label className="space-y-2 text-sm font-medium">
              <span>Preferred teammates</span>
              <TextArea className="min-h-20" value={joinListLines(participant.preferredTeammates)} onChange={(event) => onUpdate("preferredTeammates", splitList(event.target.value))} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Blocked teammates</span>
              <TextArea className="min-h-20" value={joinListLines(participant.blockedTeammates)} onChange={(event) => onUpdate("blockedTeammates", splitList(event.target.value))} />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={participant.consentToMatch} onChange={(event) => onUpdate("consentToMatch", event.target.checked)} />
              Consent to match
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={participant.consentToShareContact} onChange={(event) => onUpdate("consentToShareContact", event.target.checked)} />
              Share contact with teammates
            </label>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ListPanel title="Secondary roles" items={participant.secondaryRoles} />
        <ListPanel title="Technical skills" items={participant.technicalSkills} />
        <ListPanel title="Tools" items={participant.tools} />
        <ListPanel title="Interests" items={participant.interests} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ListPanel title="Availability" items={participant.availability} />
        <ListPanel title="Preferred teammates" items={participant.preferredTeammates} />
        <ListPanel title="Blocked teammates" items={participant.blockedTeammates} tone="warning" />
      </div>
      <div className="rounded-md border border-border bg-white p-4">
        <h3 className="font-semibold">Project signal</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {participant.projectIdeas || participant.personalStatement || "No project idea or personal statement yet."}
        </p>
      </div>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 rounded-md bg-muted px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DetailLink({ label, value }: { label: string; value?: string }) {
  return value ? (
    <a className="flex flex-wrap justify-between gap-3 rounded-md bg-muted px-3 py-2 text-primary" href={value} rel="noreferrer" target="_blank">
      <span>{label}</span>
      <span className="break-all">{value}</span>
    </a>
  ) : (
    <DetailRow label={label} value="Not provided" />
  );
}

function ListPanel({
  title,
  items,
  tone = "default"
}: {
  title: string;
  items: string[];
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="font-semibold">{title}</div>
      {items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} className={tone === "warning" ? "bg-amber-100 text-amber-800" : undefined}>
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">None listed.</p>
      )}
    </div>
  );
}

function downloadCsvBlob(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PreviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white p-2">
      <div className="text-base font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function importActionClass(action: "create" | "update" | "skip" | "error") {
  if (action === "create") return "bg-emerald-100 text-emerald-800";
  if (action === "update") return "bg-sky-100 text-sky-800";
  if (action === "skip") return "bg-slate-100 text-slate-800";
  return "bg-rose-100 text-rose-800";
}

function copyAccessLink(participant: Participant) {
  if (!participant.accessToken || typeof window === "undefined") return;
  const url = new URL(`/participant/team?access=${participant.accessToken}`, window.location.origin);
  void navigator.clipboard?.writeText(url.toString());
}

function formatAccessToken(token: string) {
  if (token.length <= 16) return token;
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
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
