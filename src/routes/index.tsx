import { createFileRoute } from "@tanstack/react-router";
import { HearthGate } from "@/components/hearth/gate";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <HearthGate />;
}
