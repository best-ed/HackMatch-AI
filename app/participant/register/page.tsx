import { Card, TextArea, TextInput } from "@/components/ui";

const fields = [
  "Full name",
  "Email",
  "Phone",
  "Institution",
  "GitHub URL",
  "LinkedIn URL",
  "Portfolio URL",
  "Primary role",
  "Secondary roles",
  "Technical skills",
  "Non-technical skills",
  "Tools",
  "Interests",
  "Preferred teammates",
  "Blocked teammates",
  "Availability"
];

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Participant registration</h1>
        <p className="mt-2 text-muted-foreground">
          MVP form for collecting the matching fields. Persistence is ready to
          connect to the PostgreSQL schema in `lib/schema.sql`.
        </p>
      </div>
      <Card>
        <form className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field} className="space-y-2 text-sm font-medium">
              <span>{field}</span>
              <TextInput placeholder={field.includes("skills") || field.includes("roles") ? "Comma-separated" : field} />
            </label>
          ))}
          <label className="space-y-2 text-sm font-medium md:col-span-2">
            <span>Project ideas</span>
            <TextArea placeholder="Problems, domains, or prototype ideas you are excited about" />
          </label>
          <label className="space-y-2 text-sm font-medium md:col-span-2">
            <span>Personal statement</span>
            <TextArea placeholder="What you bring to a team and how you like to work" />
          </label>
          <div className="space-y-3 md:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" /> I consent to be matched into a team.
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" /> I consent to share contact details with my team.
            </label>
          </div>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground md:w-fit" type="button">
            Save registration
          </button>
        </form>
      </Card>
    </div>
  );
}
