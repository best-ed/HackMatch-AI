import { Card } from "@/components/ui";
import { demoMatchingSettings } from "@/lib/demo-data";

export default function AdminSettingsPage() {
  const weights = demoMatchingSettings.weights;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Matching settings</h1>
        <p className="mt-2 text-muted-foreground">Current deterministic matching configuration.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">Constraints</h2>
          {[
            ["Desired team size", demoMatchingSettings.desiredTeamSize],
            ["Minimum team size", demoMatchingSettings.minTeamSize],
            ["Maximum team size", demoMatchingSettings.maxTeamSize],
            ["Require builder", String(demoMatchingSettings.requireBuilder)],
            ["Require presenter", String(demoMatchingSettings.requirePresenter)],
            ["Prevent beginner-only teams", String(demoMatchingSettings.preventBeginnerOnlyTeams)]
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-border py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">Weights</h2>
          {Object.entries(weights).map(([label, value]) => (
            <div key={label} className="flex justify-between border-b border-border py-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
