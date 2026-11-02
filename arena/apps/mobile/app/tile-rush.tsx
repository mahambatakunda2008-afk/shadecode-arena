import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { initializeTileRushAudio, playTileRushEffect, setTileRushAudioPreferences, stopTileRushMusic } from "../src/tile-rush-audio";
import { applySwap, createGame, dailyChallengeSeed, type GameState, type Position } from "@shadecode/tile-rush-engine";
import { ACHIEVEMENTS, ARENA_THEMES, EMPTY_PROGRESS, getDailyStreak, loadTileRushProgress, saveTileRushProgress, unlockEligibleAchievements, type ArenaThemeId, type TileRushProgress } from "../src/tile-rush-progress";

const CYAN = "#39D8E8";
const TILE_COLOURS = ["#39D8E8", "#F2B84B", "#A78BFA", "#F47F9B", "#69D391", "#E5EDF0"];
const TILE_MARKS = ["●", "◆", "▲", "■", "✦", "✚"];
const SPECIAL_MARKS = { line: "↕", prism: "✧", burst: "✹" } as const;
const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
const SESSION_MOVE_LIMIT = 30;
const TARGET_RUSH_MOVES = 15;
const TARGET_RUSH_SCORE = 1200;
const CHAIN_HUNT_MOVES = 10;
const CHAIN_HUNT_TARGET = 3;
type DailyObjective = { title: string; detail: string; metric: "score" | "cascades" | "moves"; target: number };
const DAILY_OBJECTIVES: DailyObjective[] = [
  { title: "Score Hunter", detail: "Reach 1,200 points in today's seeded run.", metric: "score", target: 1200 },
  { title: "Cascade Crafter", detail: "Build up six cascade waves across your accepted moves.", metric: "cascades", target: 6 },
  { title: "Keep the Flow", detail: "Make 20 accepted moves on today's board.", metric: "moves", target: 20 },
];
function objectiveForDate(date: string): DailyObjective {
  const day = Math.floor(Date.parse(date + "T00:00:00.000Z") / 86_400_000);
  return DAILY_OBJECTIVES[((day % DAILY_OBJECTIVES.length) + DAILY_OBJECTIVES.length) % DAILY_OBJECTIVES.length];
}
const same = (a: Position | null, b: Position) => !!a && a.row === b.row && a.col === b.col;
const adjacent = (a: Position, b: Position) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

export default function TileRushGame() {
  const { width } = useWindowDimensions();
  const gap = 4;
  const padding = 9;
  const tileSize = Math.floor((Math.min(width - 36, 440) - padding * 2 - gap * 7) / 8);
  const boardMotion = useRef(new Animated.Value(1)).current;
  const tileMotions = useRef(Array.from({ length: 64 }, () => new Animated.Value(1))).current;
  const [game, setGame] = useState<GameState>(() => createGame(newSeed()));
  const [selected, setSelected] = useState<Position | null>(null);
  const [message, setMessage] = useState("Tap a tile, then an adjacent tile to swap.");
  const [lastMove, setLastMove] = useState("Make your first move");
  const [dailyChallenge, setDailyChallenge] = useState(false);
  const [targetRush, setTargetRush] = useState(false);
  const [chainHunt, setChainHunt] = useState(false);
  const [bestMoveCascade, setBestMoveCascade] = useState(0);
  const moveLimit = targetRush ? TARGET_RUSH_MOVES : chainHunt ? CHAIN_HUNT_MOVES : SESSION_MOVE_LIMIT;
  const chainHuntWon = chainHunt && bestMoveCascade >= CHAIN_HUNT_TARGET;
  const runComplete = game.movesUsed >= moveLimit || (targetRush && game.score >= TARGET_RUSH_SCORE) || chainHuntWon;
  const [progress, setProgress] = useState<TileRushProgress>(EMPTY_PROGRESS);
  const [progressReady, setProgressReady] = useState(false);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [audioStatus, setAudioStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [reduceMotion, setReduceMotion] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const dailyObjective = objectiveForDate(today);
  const objectiveValue = dailyObjective.metric === "score" ? game.score : dailyObjective.metric === "cascades" ? game.cascades : game.movesUsed;
  const objectiveComplete = objectiveValue >= dailyObjective.target;
  const objectivePercent = Math.min(100, Math.round((objectiveValue / dailyObjective.target) * 100));

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    void initializeTileRushAudio().then(() => {
      if (active) setAudioStatus("ready");
    }).catch(() => {
      if (active) setAudioStatus("unavailable");
    });
    return () => { active = false; stopTileRushMusic(); };
  }, []);

  useEffect(() => {
    setTileRushAudioPreferences(progress.soundEnabled, progress.musicEnabled);
  }, [progress.soundEnabled, progress.musicEnabled]);

  useEffect(() => {
    let active = true;
    loadTileRushProgress().then((saved) => {
      if (!active) return;
      setProgress(saved);
      setProgressReady(true);
      setDailyCompleted(saved.completedDailyDates.includes(today));
    });
    return () => { active = false; };
  }, [today]);

  function triggerHaptic(kind: "selection" | "success" | "error") {
    if (progress.soundEnabled) playTileRushEffect(kind === "selection" ? "select" : kind);
    if (!progress.hapticsEnabled) return;
    const task = kind === "selection"
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Haptics.notificationAsync(kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    void task.catch(() => undefined);
  }

  function retryAudioSetup() {
    setAudioStatus("loading");
    void initializeTileRushAudio().then(() => setAudioStatus("ready")).catch(() => setAudioStatus("unavailable"));
  }

  function toggleHaptics() {
    const next = { ...progress, hapticsEnabled: !progress.hapticsEnabled };
    setProgress(next);
    void saveTileRushProgress(next).catch(() => setMessage("Haptic preference changed for this session, but could not be saved."));
  }

  function toggleSound() {
    const next = { ...progress, soundEnabled: !progress.soundEnabled };
    setProgress(next);
    void saveTileRushProgress(next).catch(() => setMessage("Sound preference changed for this session, but could not be saved."));
  }

  function toggleMusic() {
    const next = { ...progress, musicEnabled: !progress.musicEnabled };
    setProgress(next);
    void saveTileRushProgress(next).catch(() => setMessage("Music preference changed for this session, but could not be saved."));
  }

  function recordScore(score: number, isDaily: boolean, cascades: number) {
    if (!progressReady) return;
    setProgress((current) => {
      const dailyBestByDate = isDaily
        ? { ...current.dailyBestByDate, [today]: Math.max(current.dailyBestByDate[today] ?? 0, score) }
        : current.dailyBestByDate;
      const candidate = {
        ...current,
        personalBest: Math.max(current.personalBest, score),
        dailyBestByDate,
        lifetimeMoves: current.lifetimeMoves + 1,
        bestCascade: Math.max(current.bestCascade, cascades),
      };
      const newlyUnlocked = unlockEligibleAchievements(candidate, today).filter((id) => !current.unlockedAchievements.includes(id));
      const next = { ...candidate, unlockedAchievements: [...current.unlockedAchievements, ...newlyUnlocked] };
      if (newlyUnlocked.length) setMessage("Achievement unlocked: " + ACHIEVEMENTS.find((item) => item.id === newlyUnlocked[0])?.title + "!");
      void saveTileRushProgress(next).catch(() => setMessage("Score saved for this session. Device storage is temporarily unavailable."));
      return next;
    });
  }

  function finishDailyChallenge() {
    if (!dailyChallenge || dailyCompleted || !progressReady || !objectiveComplete) return;
    setProgress((current) => {
      const candidate = { ...current, completedDailyDates: [...new Set([...current.completedDailyDates, today])].slice(-90) };
      const newlyUnlocked = unlockEligibleAchievements(candidate, today).filter((id) => !current.unlockedAchievements.includes(id));
      const next = { ...candidate, unlockedAchievements: [...current.unlockedAchievements, ...newlyUnlocked] };
      void saveTileRushProgress(next).catch(() => setMessage("Challenge completed, but device storage is temporarily unavailable."));
      if (newlyUnlocked.length) setMessage("Achievement unlocked: " + ACHIEVEMENTS.find((item) => item.id === newlyUnlocked[0])?.title + "!");
      return next;
    });
    setDailyCompleted(true);
    setMessage("Daily objective completed! Your score and streak are stored on this device.");
  }

  function equipTheme(theme: ArenaThemeId) {
    const unlocked = theme === "classic"
      || (theme === "sunrise" && progress.unlockedAchievements.includes("first_move"))
      || (theme === "orchid" && progress.unlockedAchievements.includes("cascade_artist"))
      || (theme === "forest" && progress.unlockedAchievements.includes("high_score"));
    if (!unlocked || !progressReady) return;
    const next = { ...progress, equippedTheme: theme };
    setProgress(next);
    void saveTileRushProgress(next).catch(() => setMessage("Theme changed for this session, but could not be saved."));
  }

  function animateBoard() {
    if (reduceMotion) { boardMotion.setValue(1); return; }
    boardMotion.setValue(0);
    Animated.spring(boardMotion, { toValue: 1, speed: 20, bounciness: 5, useNativeDriver: true }).start();
  }

  function animateChangedTiles(previous: GameState, next: GameState) {
    if (reduceMotion) { tileMotions.forEach((motion) => motion.setValue(1)); return; }
    const changed: Animated.CompositeAnimation[] = [];
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const before = previous.board[row][col];
      const after = next.board[row][col];
      if (before.colour === after.colour && before.special === after.special) continue;
      const motion = tileMotions[row * 8 + col];
      motion.setValue(0.35);
      changed.push(Animated.spring(motion, { toValue: 1, speed: 24, bounciness: 8, useNativeDriver: true }));
    }
    if (changed.length) Animated.stagger(9, changed).start();
  }

  function startNewGame() {
    setDailyChallenge(false);
    setTargetRush(false);
    setChainHunt(false);
    setBestMoveCascade(0);
    setDailyCompleted(false);
    setGame(createGame(newSeed()));
    animateBoard();
    setSelected(null);
    setMessage("Fresh board. Find a match of three or more.");
    setLastMove("New practice run");
  }

  function startTargetRush() {
    setDailyChallenge(false);
    setTargetRush(true);
    setChainHunt(false);
    setBestMoveCascade(0);
    setDailyCompleted(false);
    setGame(createGame(newSeed()));
    animateBoard();
    setSelected(null);
    setMessage("Target Rush: score 1,200 points in no more than 15 accepted moves.");
    setLastMove("TARGET RUSH · 1,200 points · 15 moves · practice only");
  }

  function startChainHunt() {
    setDailyChallenge(false);
    setTargetRush(false);
    setChainHunt(true);
    setBestMoveCascade(0);
    setDailyCompleted(false);
    setGame(createGame(newSeed()));
    animateBoard();
    setSelected(null);
    setMessage("Chain Hunt: trigger three or more cascade waves from one move within ten accepted moves.");
    setLastMove("CHAIN HUNT · 3+ cascades in one move · 10 moves · practice only");
  }

  function startDailyChallenge() {
    setDailyChallenge(true);
    setTargetRush(false);
    setChainHunt(false);
    setBestMoveCascade(0);
    setDailyCompleted(progress.completedDailyDates.includes(today));
    setGame(createGame(dailyChallengeSeed(today)));
    animateBoard();
    setSelected(null);
    setMessage("Daily board loaded. Complete its objective to claim your daily streak.");
    setLastMove("Daily challenge · " + today + " · " + dailyObjective.title + " · practice only");
  }

  function replayCurrentBoard() {
    const seed = dailyChallenge ? dailyChallengeSeed(today) : game.seed;
    setGame(createGame(seed));
    setBestMoveCascade(0);
    setSelected(null);
    animateBoard();
    setMessage(dailyChallenge ? "Daily board replayed. This is still an unranked practice run." : "Same board, fresh run. Beat your previous score.");
    setLastMove(dailyChallenge ? "Daily challenge replay · practice only" : "Board replay · fresh score attempt");
  }

  function chooseTile(position: Position) {
    if (runComplete) {
      setSelected(null);
      setMessage(chainHunt ? "Chain Hunt is complete. Replay the board or start a fresh game." : targetRush ? "Target Rush is complete. Replay the board or start a fresh game." : "This run is complete. Replay the board or start a fresh game.");
      return;
    }
    if (selected === null) {
      setSelected(position);
      triggerHaptic("selection");
      setMessage("Now choose an adjacent tile.");
      return;
    }
    if (same(selected, position)) {
      setSelected(null);
      setMessage("Selection cleared. Choose a tile.");
      return;
    }
    if (!adjacent(selected, position)) {
      setSelected(position);
      setMessage("Tiles must touch. Choose an adjacent tile.");
      return;
    }
    const result = applySwap(game, { from: selected, to: position }, "practice");
    setSelected(null);
    if (!result.accepted) {
      triggerHaptic("error");
      setMessage(result.reason === "no_match" ? "No match there. The board stayed put. Try another swap." : "That move could not be made.");
      return;
    }
    triggerHaptic("success");
    animateChangedTiles(game, result.state);
    setGame(result.state);
    setBestMoveCascade((current) => Math.max(current, result.cascades));
    recordScore(result.state.score, dailyChallenge, result.cascades);
    animateBoard();
    const usedSpecial = Boolean(game.board[selected.row][selected.col].special || game.board[position.row][position.col].special);
    const specialCountBefore = game.board.flat().filter((tile) => tile.special).length;
    const specialCountAfter = result.state.board.flat().filter((tile) => tile.special).length;
    const moveTag = usedSpecial ? "SPECIAL ACTIVATED · " : specialCountAfter > specialCountBefore ? "SPECIAL CREATED · " : result.cascades > 1 ? "CASCADE CHAIN · " : "";
    setLastMove(moveTag + "+" + result.scoreGained + " points · " + result.cleared + " tiles · " + result.cascades + " cascade" + (result.cascades === 1 ? "" : "s"));
    setMessage(result.cascades > 1 ? "Cascade chain! The board keeps resolving." : "Nice. Find your next match.");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View><Text style={styles.kicker}>SHADECODE ARENA / GAME 01 · SHADE TILES: RUSH</Text><Text style={styles.title}>Shade Tiles: Rush</Text></View>
          <View style={styles.practiceBadge}><Text style={styles.practiceText}>{dailyChallenge ? "DAILY CHALLENGE" : targetRush ? "TARGET RUSH" : chainHunt ? "CHAIN HUNT" : "PRACTICE"}</Text></View>
        </View>
        <Text style={styles.subtitle}>Match three or more. Build cascades. Trigger special tiles.</Text>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statLabel}>SCORE</Text><Text style={styles.statValue}>{game.score.toLocaleString()}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>MOVES</Text><Text style={styles.statValue}>{game.movesUsed}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>CASCADES</Text><Text style={styles.statValue}>{game.cascades}</Text></View>
        </View>
        <Animated.View style={{ opacity: boardMotion, transform: [{ translateY: boardMotion.interpolate({ inputRange: [0, 1], outputRange: [9, 0] }) }, { scale: boardMotion.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }] }}>
        <View style={[styles.board, { width: tileSize * 8 + gap * 7 + padding * 2, padding, gap }]}>
          {game.board.map((row, rowIndex) => row.map((tile, colIndex) => {
            const position = { row: rowIndex, col: colIndex };
            const isSelected = same(selected, position);
            const special = tile.special;
            return (
              <Animated.View key={rowIndex + "-" + colIndex} style={{ width: tileSize, height: tileSize, transform: [{ scale: tileMotions[rowIndex * 8 + colIndex] }] }}>
                <Pressable accessibilityRole="button"
                  accessibilityLabel={"Row " + (rowIndex + 1) + ", column " + (colIndex + 1) + ", colour " + (tile.colour + 1) + (special ? ", " + special + " special" : "") + (isSelected ? ", selected" : "")}
                  accessibilityState={{ selected: isSelected }} onPress={() => chooseTile(position)}
                  style={({ pressed }) => [styles.tile, { flex: 1, backgroundColor: (ARENA_THEMES.find((theme) => theme.id === progress.equippedTheme)?.colours ?? TILE_COLOURS)[tile.colour] }, isSelected && styles.tileSelected, pressed && styles.tilePressed]}>
                  <Text style={[styles.tileMark, { fontSize: Math.max(13, tileSize * 0.43) }]}>{special ? SPECIAL_MARKS[special] : TILE_MARKS[tile.colour]}</Text>
                  {special ? <View style={styles.specialDot}><Text style={styles.specialDotText}>S</Text></View> : null}
                </Pressable>
              </Animated.View>
            );
          }))}
        </View>
        </Animated.View>
        <View style={styles.messageBox}><View style={styles.messageDot} /><Text style={styles.message}>{message}</Text></View>
        <Text style={styles.lastMove}>{lastMove}</Text>
        {runComplete ? <View style={styles.sessionComplete}>
          <Text style={styles.sessionCompleteTitle}>{chainHunt ? chainHuntWon ? "CHAIN MASTERED" : "RUN COMPLETE" : targetRush ? game.score >= TARGET_RUSH_SCORE ? "TARGET REACHED" : "TIME TO RESET" : "RUN COMPLETE"}</Text>
          <Text style={styles.sessionCompleteScore}>{game.score.toLocaleString()} points</Text>
          <Text style={styles.sessionCompleteHint}>{chainHunt ? chainHuntWon ? "You triggered at least three cascade waves from one move. Replay and try to do it earlier." : "You used all ten accepted moves without a three-wave chain. Look for setups that create matches after the first clear." : targetRush ? game.score >= TARGET_RUSH_SCORE ? "You hit the 1,200-point target. Can you beat it with fewer moves?" : "You used all 15 accepted moves. Reach 1,200 points next time." : "You used all 30 accepted moves. Your best score and move achievements have been updated on this device."}</Text>
          <Pressable accessibilityRole="button" onPress={replayCurrentBoard} style={({ pressed }) => [styles.replayButton, pressed && styles.pressed]}>
            <Text style={styles.replayButtonText}>REPLAY SAME BOARD</Text>
          </Pressable>
        </View> : <Text style={styles.sessionHint}>{moveLimit - game.movesUsed} accepted moves left in this run{targetRush ? " · 1,200-point target" : chainHunt ? " · 3 cascades in one move" : ""}</Text>}
        <View style={styles.progressRow}>
          <View style={styles.progressCard}><Text style={styles.progressLabel}>PERSONAL BEST</Text><Text style={styles.progressValue}>{progressReady ? progress.personalBest.toLocaleString() : "…"}</Text></View>
          <View style={styles.progressCard}><Text style={styles.progressLabel}>DAILY STREAK</Text><Text style={styles.progressValue}>{progressReady ? getDailyStreak(progress, today) + " days" : "…"}</Text></View>
          <View style={styles.progressCard}><Text style={styles.progressLabel}>BEST CHAIN</Text><Text style={styles.progressValue}>{progressReady ? progress.bestCascade : "…"}</Text></View>
          {dailyChallenge ? <View style={styles.progressCard}><Text style={styles.progressLabel}>TODAY'S BEST</Text><Text style={styles.progressValue}>{(progress.dailyBestByDate[today] ?? 0).toLocaleString()}</Text></View> : null}
        </View>
        {dailyChallenge ? <View style={styles.dailyObjective}>
          <View style={styles.objectiveHeading}>
            <View style={styles.achievementCopy}>
              <Text style={styles.objectiveKicker}>TODAY'S OBJECTIVE</Text>
              <Text style={styles.objectiveTitle}>{dailyObjective.title}</Text>
              <Text style={styles.dailyGameHint}>{dailyObjective.detail}</Text>
            </View>
            <Text style={styles.objectiveValue}>{Math.min(objectiveValue, dailyObjective.target).toLocaleString()} / {dailyObjective.target.toLocaleString()}</Text>
          </View>
          <View style={styles.objectiveTrack}><View style={[styles.objectiveFill, { width: objectivePercent + "%" }]} /></View>
          <Pressable accessibilityRole="button" disabled={dailyCompleted || !progressReady || !objectiveComplete} onPress={finishDailyChallenge} style={({ pressed }) => [styles.finishDaily, (dailyCompleted || !progressReady || !objectiveComplete) && styles.disabled, pressed && styles.pressed]}>
            <Text style={styles.finishDailyText}>{dailyCompleted ? "TODAY'S CHALLENGE COMPLETED ✓" : objectiveComplete ? "CLAIM DAILY COMPLETION" : "OBJECTIVE IN PROGRESS"}</Text>
            <Text style={styles.dailyGameHint}>{dailyCompleted ? "Your streak is secured on this device." : objectiveComplete ? "Claim this challenge to record today's streak." : "Complete the objective to secure today's streak."}</Text>
          </Pressable>
        </View> : null}
        <Pressable accessibilityRole="button" onPress={startNewGame} style={({ pressed }) => [styles.newGame, pressed && styles.pressed]}>
          <Text style={styles.newGameText}>NEW PRACTICE GAME</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={startTargetRush} style={({ pressed }) => [styles.dailyGame, pressed && styles.pressed]}>
          <Text style={styles.dailyGameText}>PLAY TARGET RUSH</Text>
          <Text style={styles.dailyGameHint}>Score 1,200 points in 15 moves · new board each run · offline practice</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={startChainHunt} style={({ pressed }) => [styles.dailyGame, pressed && styles.pressed]}>
          <Text style={styles.dailyGameText}>PLAY CHAIN HUNT</Text>
          <Text style={styles.dailyGameHint}>Trigger 3+ cascades in one move within 10 moves · offline skill challenge</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={startDailyChallenge} style={({ pressed }) => [styles.dailyGame, pressed && styles.pressed]}>
          <Text style={styles.dailyGameText}>PLAY TODAY'S DAILY CHALLENGE</Text>
          <Text style={styles.dailyGameHint}>Same seeded board for everyone · works offline · unranked</Text>
        </Pressable>
        <View style={styles.unlockPanel}>
          <Text style={styles.unlockTitle}>GAME FEEDBACK</Text>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: progress.hapticsEnabled }} onPress={toggleHaptics} style={styles.settingRow}>
            <View style={styles.achievementCopy}>
              <Text style={styles.achievementName}>Haptic feedback</Text>
              <Text style={styles.achievementDescription}>Gentle touch feedback for selections, successful moves and invalid swaps.</Text>
            </View>
            <Text style={[styles.settingValue, progress.hapticsEnabled && styles.rewardUnlocked]}>{progress.hapticsEnabled ? "ON" : "OFF"}</Text>
          </Pressable>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: progress.soundEnabled }} onPress={toggleSound} style={styles.settingRow}>
            <View style={styles.achievementCopy}>
              <Text style={styles.achievementName}>Game sound effects</Text>
              <Text style={styles.achievementDescription}>Offline tones for tile selection, successful moves and invalid swaps.</Text>
            </View>
            <Text style={[styles.settingValue, progress.soundEnabled && styles.rewardUnlocked]}>{progress.soundEnabled ? "ON" : "OFF"}</Text>
          </Pressable>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: progress.musicEnabled }} onPress={toggleMusic} style={styles.settingRow}>
            <View style={styles.achievementCopy}>
              <Text style={styles.achievementName}>Ambient music</Text>
              <Text style={styles.achievementDescription}>A soft, locally generated 8-second loop. Off by default.</Text>
            </View>
            <Text style={[styles.settingValue, progress.musicEnabled && styles.rewardUnlocked]}>{progress.musicEnabled ? "ON" : "OFF"}</Text>
          </Pressable>
          <Text style={styles.hint}>Audio is generated and stored on-device. No streaming, tracking or microphone access.</Text>
          <View accessibilityLiveRegion="polite" style={styles.audioStatusRow}>
            <Text style={styles.hint}>{audioStatus === "ready" ? "Audio system ready on this device." : audioStatus === "loading" ? "Preparing offline audio…" : "Audio could not initialise. Gameplay remains fully available."}</Text>
            {audioStatus === "unavailable" ? <Pressable accessibilityRole="button" onPress={retryAudioSetup} style={styles.audioRetry}><Text style={styles.audioRetryText}>RETRY</Text></Pressable> : null}
          </View>
        </View>
        <View style={styles.unlockPanel}>
          <Text style={styles.unlockTitle}>ACHIEVEMENTS</Text>
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = progress.unlockedAchievements.includes(achievement.id);
            return (
              <View key={achievement.id} style={styles.achievementRow}>
                <View style={[styles.achievementIcon, unlocked && styles.achievementUnlocked]}>
                  <Text style={styles.achievementIconText}>{unlocked ? "✓" : "★"}</Text>
                </View>
                <View style={styles.achievementCopy}>
                  <Text style={[styles.achievementName, !unlocked && styles.muted]}>{achievement.title}</Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                </View>
                <Text style={[styles.achievementReward, unlocked && styles.rewardUnlocked]}>{unlocked ? "UNLOCKED" : achievement.reward}</Text>
              </View>
            );
          })}
        </View>
        <View style={styles.unlockPanel}>
          <Text style={styles.unlockTitle}>TILE THEMES</Text>
          <Text style={styles.hint}>Earn cosmetics through play. Themes never change scoring or gameplay.</Text>
          <View style={styles.themeChoices}>
            {ARENA_THEMES.map((theme) => {
              const unlocked = theme.id === "classic"
                || (theme.id === "sunrise" && progress.unlockedAchievements.includes("first_move"))
                || (theme.id === "orchid" && progress.unlockedAchievements.includes("cascade_artist"))
                || (theme.id === "forest" && progress.unlockedAchievements.includes("high_score"));
              const selectedTheme = progress.equippedTheme === theme.id;
              return (
                <Pressable key={theme.id} accessibilityRole="button" accessibilityState={{ selected: selectedTheme, disabled: !unlocked }}
                  disabled={!unlocked || !progressReady} onPress={() => equipTheme(theme.id)}
                  style={[styles.themeChoice, selectedTheme && styles.themeSelected, !unlocked && styles.themeLocked]}>
                  <View style={styles.themeSwatches}>
                    {theme.colours.slice(0, 4).map((colour, index) => <View key={index} style={[styles.themeSwatch, { backgroundColor: colour }]} />)}
                  </View>
                  <Text style={[styles.themeName, selectedTheme && styles.themeNameSelected]}>{theme.name}</Text>
                  <Text style={styles.themeUnlock}>{unlocked ? (selectedTheme ? "EQUIPPED" : "OWNED") : theme.unlock}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>SPECIAL TILES</Text>
          <Text style={styles.legendText}>↕ Line clear  ·  ✧ Prism  ·  ✹ Burst</Text>
          <Text style={styles.hint}>Four in a line creates a Line Clear. Five in a line creates a Prism. Connected T/L matches create a Burst.</Text>
        </View>
        <View style={styles.lockedModes}>
          <Text style={styles.lockedTitle}>MORE WAYS TO PLAY</Text>
          <Text style={styles.lockedText}>Ranked and Blitz are being prepared for server-verified scoring and timing. They will not appear as live competitions until those systems are ready.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#07131B"},
  content:{alignItems:"center",paddingHorizontal:18,paddingTop:12,paddingBottom:36,gap:13},
  topRow:{width:"100%",flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  kicker:{color:CYAN,fontSize:9,fontWeight:"900",letterSpacing:1.2},
  title:{color:"#F4FAFC",fontSize:34,fontWeight:"900",letterSpacing:-0.8,marginTop:3},
  practiceBadge:{borderWidth:1,borderColor:"#205461",borderRadius:20,paddingHorizontal:10,paddingVertical:6},
  practiceText:{color:CYAN,fontSize:9,fontWeight:"900",letterSpacing:1},
  subtitle:{width:"100%",color:"#9FB2BC",fontSize:12,lineHeight:18},
  stats:{width:"100%",flexDirection:"row",gap:8},
  stat:{flex:1,backgroundColor:"#10232D",borderWidth:1,borderColor:"#1B3945",borderRadius:13,padding:11,gap:4},
  statLabel:{color:"#78909A",fontSize:8,fontWeight:"900",letterSpacing:1.1},
  statValue:{color:"#F4FAFC",fontSize:20,fontWeight:"900",fontVariant:["tabular-nums"]},
  board:{flexDirection:"row",flexWrap:"wrap",backgroundColor:"#10232D",borderRadius:17,borderWidth:1,borderColor:"#1D3A47",justifyContent:"center"},
  tile:{borderRadius:7,alignItems:"center",justifyContent:"center",position:"relative"},
  tileMark:{color:"#07131B",fontWeight:"900",textAlign:"center"},
  tileSelected:{borderWidth:3,borderColor:"#FFFFFF",transform:[{scale:0.91}]},
  tilePressed:{opacity:0.72},
  specialDot:{position:"absolute",right:2,top:2,width:13,height:13,borderRadius:7,backgroundColor:"#07131B",alignItems:"center",justifyContent:"center"},
  specialDotText:{color:"#FFFFFF",fontSize:8,fontWeight:"900"},
  messageBox:{width:"100%",flexDirection:"row",alignItems:"center",gap:9,backgroundColor:"#10232D",borderRadius:12,padding:12,minHeight:43},
  messageDot:{width:7,height:7,borderRadius:4,backgroundColor:CYAN},
  message:{color:"#D8E5E9",fontSize:11,lineHeight:16,flex:1},
  lastMove:{color:"#91A8B2",fontSize:10,alignSelf:"flex-start",minHeight:14},
  sessionHint:{width:"100%",color:"#78909A",fontSize:9,fontWeight:"800",letterSpacing:0.5},
  sessionComplete:{width:"100%",backgroundColor:"#102B34",borderWidth:1,borderColor:"#28616D",borderRadius:14,padding:14,gap:7,alignItems:"center"},
  sessionCompleteTitle:{color:CYAN,fontSize:10,fontWeight:"900",letterSpacing:1.3},
  sessionCompleteScore:{color:"#F4FAFC",fontSize:28,fontWeight:"900",fontVariant:["tabular-nums"]},
  sessionCompleteHint:{color:"#A9BEC7",fontSize:10,lineHeight:15,textAlign:"center"},
  replayButton:{width:"100%",backgroundColor:CYAN,borderRadius:10,padding:12,alignItems:"center",marginTop:3},
  replayButtonText:{color:"#06151D",fontSize:10,fontWeight:"900",letterSpacing:0.9},
  progressRow:{width:"100%",flexDirection:"row",gap:7},
  progressCard:{flex:1,backgroundColor:"#0D202A",borderWidth:1,borderColor:"#183541",borderRadius:11,padding:10,gap:4},
  progressLabel:{color:"#78909A",fontSize:7,fontWeight:"900",letterSpacing:0.8},
  progressValue:{color:"#F4FAFC",fontSize:15,fontWeight:"900",fontVariant:["tabular-nums"]},
  dailyObjective:{width:"100%",backgroundColor:"#0D202A",borderWidth:1,borderColor:"#24515C",borderRadius:13,padding:12,gap:10},
  objectiveHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},
  objectiveKicker:{color:CYAN,fontSize:8,fontWeight:"900",letterSpacing:1},
  objectiveTitle:{color:"#F4FAFC",fontSize:14,fontWeight:"900",marginTop:3},
  objectiveValue:{color:CYAN,fontSize:11,fontWeight:"900",fontVariant:["tabular-nums"]},
  objectiveTrack:{height:7,backgroundColor:"#1A3540",borderRadius:5,overflow:"hidden"},
  objectiveFill:{height:7,backgroundColor:CYAN,borderRadius:5},
  finishDaily:{width:"100%",borderWidth:1,borderColor:"#28616D",backgroundColor:"#102B34",borderRadius:13,padding:13,alignItems:"center",gap:5},
  finishDailyText:{color:CYAN,fontSize:10,fontWeight:"900",letterSpacing:0.8},
  disabled:{opacity:0.55},
  newGame:{width:"100%",backgroundColor:CYAN,borderRadius:13,padding:15,alignItems:"center"},
  newGameText:{color:"#06151D",fontSize:11,fontWeight:"900",letterSpacing:1.2},
  dailyGame:{width:"100%",borderWidth:1,borderColor:"#28616D",backgroundColor:"#0D202A",borderRadius:13,padding:13,alignItems:"center",gap:5},
  dailyGameText:{color:CYAN,fontSize:10,fontWeight:"900",letterSpacing:1},
  dailyGameHint:{color:"#91A8B2",fontSize:9},
  pressed:{opacity:0.78},
  unlockPanel:{width:"100%",backgroundColor:"#0D202A",borderWidth:1,borderColor:"#183541",borderRadius:13,padding:13,gap:10},
  unlockTitle:{color:CYAN,fontSize:9,fontWeight:"900",letterSpacing:1.2},
  achievementRow:{flexDirection:"row",alignItems:"center",gap:9,minHeight:43},
  settingRow:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:7},
  settingValue:{color:"#91A8B2",fontSize:9,fontWeight:"900",letterSpacing:1.1,minWidth:34,textAlign:"right"},
  audioStatusRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},
  audioRetry:{borderWidth:1,borderColor:CYAN,borderRadius:8,paddingHorizontal:10,paddingVertical:7},
  audioRetryText:{color:CYAN,fontSize:8,fontWeight:"900",letterSpacing:0.8},
  achievementIcon:{width:25,height:25,borderRadius:13,backgroundColor:"#1A303B",alignItems:"center",justifyContent:"center"},
  achievementUnlocked:{backgroundColor:"#174B4B"},
  achievementIconText:{color:"#91A8B2",fontSize:12,fontWeight:"900"},
  achievementCopy:{flex:1,gap:2},
  achievementName:{color:"#F4FAFC",fontSize:10,fontWeight:"900"},
  achievementDescription:{color:"#91A8B2",fontSize:9,lineHeight:13},
  achievementReward:{color:"#718A95",fontSize:7,fontWeight:"900",maxWidth:80,textAlign:"right"},
  rewardUnlocked:{color:CYAN},
  muted:{color:"#91A8B2"},
  themeChoices:{flexDirection:"row",flexWrap:"wrap",gap:8},
  themeChoice:{width:"48%",borderWidth:1,borderColor:"#23404A",borderRadius:10,padding:9,gap:6},
  themeSelected:{borderColor:CYAN,backgroundColor:"#102D36"},
  themeLocked:{opacity:0.45},
  themeSwatches:{flexDirection:"row",gap:4},
  themeSwatch:{width:16,height:16,borderRadius:5},
  themeName:{color:"#D8E5E9",fontSize:10,fontWeight:"900"},
  themeNameSelected:{color:CYAN},
  themeUnlock:{color:"#78909A",fontSize:7,fontWeight:"900",letterSpacing:0.7},
  legend:{width:"100%",backgroundColor:"#0D202A",borderWidth:1,borderColor:"#183541",borderRadius:13,padding:13,gap:6},
  legendTitle:{color:CYAN,fontSize:9,fontWeight:"900",letterSpacing:1.2},
  legendText:{color:"#F4FAFC",fontSize:11,fontWeight:"800"},
  hint:{color:"#91A8B2",fontSize:10,lineHeight:16},
  lockedModes:{width:"100%",padding:13,gap:6},
  lockedTitle:{color:"#78909A",fontSize:9,fontWeight:"900",letterSpacing:1.2},
  lockedText:{color:"#718A95",fontSize:10,lineHeight:16}
});
