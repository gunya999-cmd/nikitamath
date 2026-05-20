import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticFlow } from "@/modules/diagnostics/components/DiagnosticFlow";

function Page() {
  return <DiagnosticFlow />;
}

export const Route = createFileRoute("/_authenticated/diagnostic")({
  component: Page,
});
