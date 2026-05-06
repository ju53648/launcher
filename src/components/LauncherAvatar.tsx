import { Compass, Flame, Rocket, Sparkles } from "lucide-react";

import type { LauncherAvatarId } from "../domain/personalization";

const avatarIcons = {
  signal: Sparkles,
  ember: Flame,
  scout: Compass,
  nova: Rocket
} satisfies Record<LauncherAvatarId, typeof Sparkles>;

export function LauncherAvatar({
  avatarId,
  size = "md"
}: {
  avatarId: LauncherAvatarId;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = avatarIcons[avatarId];

  return (
    <span className={`launcher-avatar launcher-avatar--${avatarId} launcher-avatar--${size}`}>
      <Icon size={size === "lg" ? 22 : size === "sm" ? 14 : 18} />
    </span>
  );
}