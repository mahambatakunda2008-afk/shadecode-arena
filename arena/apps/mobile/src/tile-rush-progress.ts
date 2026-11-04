import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "shadecode-arena:tile-rush:progress:v1";

export type ArenaThemeId = "classic" | "sunrise" | "orchid" | "forest";
export type AchievementId = "first_move" | "cascade_artist" | "high_score" | "daily_regular" | "daily_veteran";

export type TileRushProgress = {
  personalBest: number;
  dailyBestByDate: Record<string, number>;
  completedDailyDates: string[];
  lifetimeMoves: number;
  bestCascade: number;
  unlockedAchievements: AchievementId[];
  equippedTheme: ArenaThemeId;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
};

export const EMPTY_PROGRESS: TileRushProgress = {
  personalBest: 0,
  dailyBestByDate: {},
  completedDailyDates: [],
  lifetimeMoves: 0,
  bestCascade: 0,
  unlockedAchievements: [],
  equippedTheme: "classic",
  hapticsEnabled: true,
  soundEnabled: true,
  musicEnabled: false,
};

export const ACHIEVEMENTS: { id: AchievementId; title: string; description: string; reward: string }[] = [
  { id: "first_move", title: "First Steps", description: "Make your first accepted move.", reward: "Sunrise tiles" },
  { id: "cascade_artist", title: "Cascade Artist", description: "Trigger three or more cascade waves from a single move.", reward: "Orchid tiles" },
  { id: "high_score", title: "Four Digits", description: "Reach a personal best of 1,000 points.", reward: "Forest tiles" },
  { id: "daily_regular", title: "Showing Up", description: "Build a three-day daily challenge streak.", reward: "Daily regular badge" },
  { id: "daily_veteran", title: "Seven Strong", description: "Build a seven-day daily challenge streak.", reward: "Daily veteran badge" },
];

export const ARENA_THEMES: { id: ArenaThemeId; name: string; colours: string[]; unlock: string }[] = [
  { id: "classic", name: "Classic", colours: ["#39D8E8", "#F2B84B", "#A78BFA", "#F47F9B", "#69D391", "#E5EDF0"], unlock: "Available" },
  { id: "sunrise", name: "Sunrise", colours: ["#FF9F68", "#FFD166", "#EF476F", "#F78C6B", "#B8DE6F", "#F7E7CE"], unlock: "First Steps" },
  { id: "orchid", name: "Orchid", colours: ["#D98CFF", "#A78BFA", "#F0A6CA", "#8ECAE6", "#CDB4DB", "#FDE2E4"], unlock: "Cascade Artist" },
  { id: "forest", name: "Forest", colours: ["#80B918", "#55A630", "#2D6A4F", "#95D5B2", "#D8F3DC", "#F4D35E"], unlock: "Four Digits" },
];

export function isArenaDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getArenaLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function getDailyStreak(progress: TileRushProgress, today: string): number {
  if (!isArenaDate(today)) return 0;
  const completed = new Set(progress.completedDailyDates);
  let cursor = new Date(today + "T00:00:00.000Z");
  if (!completed.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (completed.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function unlockEligibleAchievements(progress: TileRushProgress, today: string): AchievementId[] {
  const streak = getDailyStreak(progress, today);
  const earned: AchievementId[] = [];
  if (progress.lifetimeMoves >= 1) earned.push("first_move");
  if (progress.bestCascade >= 3) earned.push("cascade_artist");
  if (progress.personalBest >= 1000) earned.push("high_score");
  if (streak >= 3) earned.push("daily_regular");
  if (streak >= 7) earned.push("daily_veteran");
  return earned;
}

export async function loadTileRushProgress(): Promise<TileRushProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return EMPTY_PROGRESS;
    const record = value as Partial<TileRushProgress>;
    const theme = ARENA_THEMES.some((item) => item.id === record.equippedTheme) ? record.equippedTheme! : "classic";
    const dailyBestByDate = Object.fromEntries(
      Object.entries(record.dailyBestByDate && typeof record.dailyBestByDate === "object" && !Array.isArray(record.dailyBestByDate) ? record.dailyBestByDate : {})
        .filter(([date, score]) => isArenaDate(date) && typeof score === "number" && Number.isFinite(score) && score >= 0)
        .slice(-90),
    );
    return {
      personalBest: Number.isFinite(record.personalBest) ? Math.max(0, Number(record.personalBest)) : 0,
      dailyBestByDate,
      completedDailyDates: Array.isArray(record.completedDailyDates)
        ? record.completedDailyDates.filter((date): date is string => typeof date === "string" && isArenaDate(date)).slice(-90)
        : [],
      lifetimeMoves: Number.isFinite(record.lifetimeMoves) ? Math.max(0, Number(record.lifetimeMoves)) : 0,
      bestCascade: Number.isFinite(record.bestCascade) ? Math.max(0, Number(record.bestCascade)) : 0,
      unlockedAchievements: Array.isArray(record.unlockedAchievements)
        ? record.unlockedAchievements.filter((id): id is AchievementId => ACHIEVEMENTS.some((item) => item.id === id))
        : [],
      equippedTheme: theme,
      hapticsEnabled: typeof record.hapticsEnabled === "boolean" ? record.hapticsEnabled : true,
      soundEnabled: typeof record.soundEnabled === "boolean" ? record.soundEnabled : true,
      musicEnabled: typeof record.musicEnabled === "boolean" ? record.musicEnabled : false,
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export async function saveTileRushProgress(progress: TileRushProgress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...progress,
    dailyBestByDate: Object.fromEntries(Object.entries(progress.dailyBestByDate).filter(([date, score]) => isArenaDate(date) && Number.isFinite(score) && score >= 0).slice(-90)),
    completedDailyDates: [...new Set(progress.completedDailyDates)].filter(isArenaDate).slice(-90),
    unlockedAchievements: [...new Set(progress.unlockedAchievements)],
  }));
}
