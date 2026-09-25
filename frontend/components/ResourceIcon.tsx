import { DoorOpen, Camera, Mic2 } from "lucide-react";
import type { Resource } from "../types";
export function ResourceIcon({
  kind,
  size = 20,
}: {
  kind: Resource["kind"];
  size?: number;
}) {
  const Icon =
    kind === "equipment" ? Camera : kind === "studio" ? Mic2 : DoorOpen;
  return <Icon size={size} aria-hidden="true" />;
}
