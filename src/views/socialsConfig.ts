export type SocialPlatform = {
  id: "discord" | "youtube";
  section: "community" | "content";
  name: string;
  description: string;
  url: string;
};

export const socialPlatforms: SocialPlatform[] = [
  {
    id: "discord",
    section: "community",
    name: "Discord",
    description:
      "Join the Lumorix community, chat with others, and stay connected.",
    url: "https://discord.gg/zWZzDpu6bu"
  },
  {
    id: "youtube",
    section: "content",
    name: "YouTube",
    description: "Watch updates, showcases, and development progress.",
    url: "https://www.youtube.com/@Lumorix.official"
  }
];
