import { createFileRoute } from "@tanstack/react-router";
import { DailyLessonDashboard } from "@/modules/learning/components/DailyLessonDashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DailyLessonDashboard,
});
