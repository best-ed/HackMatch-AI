import { Badge, Card } from "@/components/ui";
import { demoParticipants } from "@/lib/demo-data";

export default function AdminParticipantsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Participants</h1>
        <p className="mt-2 text-muted-foreground">Demo registrations available to the matcher.</p>
      </div>
      <Card className="table-scroll p-0">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="bg-muted text-left">
            <tr>
              {["Name", "Role", "Experience", "Skills", "Interests", "Consent"].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {demoParticipants.map((participant) => (
              <tr key={participant.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{participant.fullName}</div>
                  <div className="text-xs text-muted-foreground">{participant.email}</div>
                </td>
                <td className="px-4 py-3">{participant.primaryRole}</td>
                <td className="px-4 py-3 capitalize">{participant.experienceLevel}</td>
                <td className="px-4 py-3">{participant.technicalSkills.slice(0, 3).join(", ")}</td>
                <td className="px-4 py-3">{participant.interests.slice(0, 2).join(", ")}</td>
                <td className="px-4 py-3">
                  <Badge className={participant.consentToMatch ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
                    {participant.consentToMatch ? "Matchable" : "Excluded"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
