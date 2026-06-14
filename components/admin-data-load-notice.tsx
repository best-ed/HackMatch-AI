"use client";

import { LoaderCircle } from "lucide-react";
import { Card } from "@/components/ui";

export function AdminDataLoadNotice({
  loaded,
  label = "workspace data"
}: {
  loaded: boolean;
  label?: string;
}) {
  if (loaded) return null;

  return (
    <Card className="flex items-center gap-3 border-sky-200 bg-sky-50 py-3 text-sm text-sky-900">
      <LoaderCircle className="animate-spin" size={18} />
      <div>
        <div className="font-semibold">Loading {label}</div>
        <p className="mt-0.5 text-sky-800">
          Reading browser-local data first, then checking whether remote persistence is available.
        </p>
      </div>
    </Card>
  );
}
