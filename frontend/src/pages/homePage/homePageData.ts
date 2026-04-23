const LIVE_ROWS = [
  { time: "00:51 AM", header: "Offline", description: "" },
  { time: "00:41 AM", header: "Online • Wynncraft", description: "on EU2" },
  { time: "00:38 AM", header: "Offline", description: "" },
  {
    time: "11:23 AM",
    header: "Online • Hypixel",
    description: "playing SkyBlock • Hub",
  },
  {
    time: "11:21 PM",
    header: "Online • Hypixel",
    description: "playing SkyBlock • Dwarven Mines",
  },
] as const;

const HERO_SUGGESTIONS = [
  "Grian",
  "Avoma",
  "Technoblade",
  "HellCastleBTW",
] as const;

const SOURCE_COVERAGE_ROWS = [
  { source: "Mojang", fields: "uuid • skin/cape • favorites" },
  { source: "Hypixel", fields: "rank • guild • global stats • Bedwars" },
  { source: "Wynncraft", fields: "characters • rankings • ability tree" },
  { source: "MCC Island", fields: "status • level • trophies • friends" },
  { source: "DonutSMP", fields: "economy • kills/deaths • world stats" },
  { source: "Status", fields: "live server • timeline history" },
] as const;

const LAST_ACTIVITY_PREVIEW = {
  stateLabel: "Online",
  stateValue: "Playing Wynncraft on EU2",
  firstSeenLabel: "First seen on",
  firstSeenValue: "May 22, 2020",
} as const;

const HISTOGRAM_BAR_CLASSES = [
  "bar-1",
  "bar-2",
  "bar-3",
  "bar-4",
  "bar-5",
  "bar-6",
] as const;

const LEADERBOARD_ROWS = [
  { rank: 1, player: "RealAlex", score: "45.3K", highlight: true },
  { rank: 2, player: "Calluum", score: "36.2K", highlight: true },
  { rank: 3, player: "LuCoolUs", score: "26.7K", highlight: true },
  { rank: 4, player: "SmileyAlec", score: "16K", highlight: false },
  { rank: 5, player: "Salted", score: "16K", highlight: false },
] as const;

type PercentileView = "distribution" | "leaderboard";

export {
  HERO_SUGGESTIONS,
  HISTOGRAM_BAR_CLASSES,
  LAST_ACTIVITY_PREVIEW,
  LEADERBOARD_ROWS,
  LIVE_ROWS,
  SOURCE_COVERAGE_ROWS,
};
export type { PercentileView };
