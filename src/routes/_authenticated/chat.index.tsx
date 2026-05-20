import { createFileRoute } from "@tanstack/react-router";
import { NewChatRedirect } from "@/modules/tutor/components/NewChatRedirect";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: NewChatRedirect,
});
