import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ACHIEVEMENTS, ARENA_THEMES, EMPTY_PROGRESS, loadTileRushProgress, type TileRushProgress } from "../src/tile-rush-progress";

const CIRCUIT_KEY = "shadecode-arena:circuit-breaker:progress:v1";
const CYAN = "#39D8E8";
type CircuitProgress = { unlockedLevel: number; completedLevels: number[]; bestMovesByLevel: Record<string, number>; dailyCompleted: string[] };
const EMPTY_CIRCUIT: CircuitProgress = { unlockedLevel: 1, completedLevels: [], bestMovesByLevel: {}, dailyCompleted: [] };

export default function PlayerProfile() {
  const [tile, setTile] = useState<TileRushProgress>(EMPTY_PROGRESS);
  const [circuit, setCircuit] = useState<CircuitProgress>(EMPTY_CIRCUIT);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      loadTileRushProgress(),
      AsyncStorage.getItem(CIRCUIT_KEY).then(raw => {
        if (!raw) return EMPTY_CIRCUIT;
        try {
          const value = JSON.parse(raw) as Partial<CircuitProgress>;
          return {
            unlockedLevel: Number.isInteger(value.unlockedLevel) ? Math.max(1, Number(value.unlockedLevel)) : 1,
            completedLevels: Array.isArray(value.completedLevels) ? value.completedLevels.filter((n): n is number => Number.isInteger(n) && n > 0) : [],
            bestMovesByLevel: value.bestMovesByLevel && typeof value.bestMovesByLevel === "object" && !Array.isArray(value.bestMovesByLevel) ? Object.fromEntries(Object.entries(value.bestMovesByLevel).filter(([level, moves]) => /^\d+$/.test(level) && Number(level) > 0 && Number.isInteger(moves) && Number(moves) > 0)) : {},
            dailyCompleted: Array.isArray(value.dailyCompleted) ? [...new Set(value.dailyCompleted.filter((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)))].slice(-90) : [],
          };
        } catch { return EMPTY_CIRCUIT; }
      }),
    ]).then(([tileProgress, circuitProgress]) => {
      if (!active) return;
      setTile(tileProgress);
      setCircuit(circuitProgress);
      setReady(true);
    }).catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const theme = ARENA_THEMES.find(item => item.id === tile.equippedTheme)?.name ?? "Classic";
  const earned = ACHIEVEMENTS.filter(item => tile.unlockedAchievements.includes(item.id));
  const circuitBestMoves = Object.values(circuit.bestMovesByLevel).filter(Number.isInteger).reduce<number | null>((best, moves) => best === null ? moves : Math.min(best, moves), null);
  const stats = [
    { label: "SHADE TILES BEST", value: tile.personalBest.toLocaleString() },
    { label: "LIFETIME MOVES", value: tile.lifetimeMoves.toLocaleString() },
    { label: "BEST CASCADE", value: String(tile.bestCascade) },
    { label: "CIRCUIT LEVEL", value: String(circuit.unlockedLevel) },
    { label: "CIRCUITS CLEARED", value: String(circuit.completedLevels.length) },
    { label: "BEST CIRCUIT", value: circuitBestMoves === null ? "—" : `${circuitBestMoves} moves` },
    { label: "TILE DAILY RUNS", value: String(tile.completedDailyDates.length) },
    { label: "CIRCUIT DAILY RUNS", value: String(circuit.dailyCompleted.length) },
  ];

  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.page}>
    <Link href="/" asChild><Pressable><Text style={s.back}>‹ ARENA</Text></Pressable></Link>
    <Text style={s.kicker}>PLAYER PROFILE</Text>
    <Text style={s.title}>Your progress, in one place.</Text>
    <Text style={s.copy}>This profile currently reflects progress saved on this device. Account sync and verified competitive records are not live yet.</Text>
    {!ready ? <Text style={s.loading}>Loading your game record…</Text> : <>
      <View style={s.identity}><View style={s.avatar}><Text style={s.avatarText}>S</Text></View><View style={{flex:1,gap:4}}><Text style={s.name}>Local player</Text><Text style={s.muted}>SHADECODE ARENA · DEVICE PROFILE</Text></View><Text style={s.badge}>OFFLINE</Text></View>
      <Text style={s.section}>YOUR STATS</Text>
      <View style={s.grid}>{stats.map(item=><View key={item.label} style={s.stat}><Text style={s.statLabel}>{item.label}</Text><Text style={s.statValue}>{item.value}</Text></View>)}</View>
      <Text style={s.section}>ACHIEVEMENTS · {earned.length}/{ACHIEVEMENTS.length}</Text>
      {ACHIEVEMENTS.map(item=>{
        const unlocked=tile.unlockedAchievements.includes(item.id);
        return <View key={item.id} style={[s.row,!unlocked&&s.locked]}><Text style={s.medal}>{unlocked?"✦":"◇"}</Text><View style={{flex:1,gap:3}}><Text style={s.rowTitle}>{item.title}</Text><Text style={s.copy}>{item.description}</Text><Text style={s.reward}>{unlocked?"UNLOCKED":"LOCKED"} · {item.reward}</Text></View></View>;
      })}
      <Text style={s.section}>EQUIPPED LOOK</Text>
      <View style={s.row}><View style={s.swatches}>{(ARENA_THEMES.find(item=>item.id===tile.equippedTheme)?.colours??ARENA_THEMES[0].colours).slice(0,4).map(colour=><View key={colour} style={[s.swatch,{backgroundColor:colour}]}/>)}</View><View style={{flex:1,gap:3}}><Text style={s.rowTitle}>{theme} tiles</Text><Text style={s.copy}>Cosmetic only. No gameplay advantage.</Text></View></View>
    </>}
    <View style={s.notice}><Text style={s.noticeTitle}>COMING WITH ONLINE ACCOUNTS</Text><Text style={s.copy}>Player handles, cross-device sync, friends, verified ranked results, public leaderboards and tournament history will arrive with the Arena online services.</Text></View>
    <Link href="/tile-rush" asChild><Pressable style={s.button}><Text style={s.buttonText}>PLAY SHADE TILES: RUSH</Text></Pressable></Link>
    <Link href="/circuit-breaker" asChild><Pressable style={s.secondary}><Text style={s.secondaryText}>PLAY CIRCUIT BREAKER</Text></Pressable></Link>
  </ScrollView></SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#07131B"},page:{padding:22,paddingBottom:40,gap:14},
 back:{color:CYAN,fontSize:12,fontWeight:"900",letterSpacing:1,marginBottom:8},kicker:{color:CYAN,fontSize:10,fontWeight:"900",letterSpacing:2},
 title:{color:"#F4FAFC",fontSize:32,lineHeight:37,fontWeight:"900",letterSpacing:-.7},copy:{color:"#9FB2BC",fontSize:12,lineHeight:18},
 loading:{color:"#9FB2BC",paddingVertical:20},identity:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#10232D",borderColor:"#1D3A47",borderWidth:1,borderRadius:18,padding:15},
 avatar:{width:48,height:48,borderRadius:16,backgroundColor:"#123A46",alignItems:"center",justifyContent:"center"},avatarText:{color:CYAN,fontSize:24,fontWeight:"900"},
 name:{color:"#F4FAFC",fontSize:16,fontWeight:"900"},muted:{color:"#6F8792",fontSize:9,fontWeight:"800",letterSpacing:1},badge:{color:"#69D391",fontSize:9,fontWeight:"900",borderWidth:1,borderColor:"#285C4B",padding:6,borderRadius:9},
 section:{color:"#6F8792",fontSize:10,fontWeight:"900",letterSpacing:1.7,marginTop:8},grid:{flexDirection:"row",flexWrap:"wrap",gap:9},stat:{width:"48%",flexGrow:1,backgroundColor:"#0D202A",borderWidth:1,borderColor:"#183541",borderRadius:14,padding:13,gap:7},statLabel:{color:"#6F8792",fontSize:9,fontWeight:"900",letterSpacing:1},statValue:{color:"#F4FAFC",fontSize:24,fontWeight:"900"},
 row:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:"#0D202A",borderColor:"#183541",borderWidth:1,borderRadius:14,padding:13},locked:{opacity:.55},medal:{fontSize:25,color:CYAN,width:28,textAlign:"center"},rowTitle:{color:"#F4FAFC",fontSize:14,fontWeight:"800"},reward:{color:CYAN,fontSize:9,fontWeight:"900",letterSpacing:.7},swatches:{flexDirection:"row",gap:4},swatch:{width:17,height:34,borderRadius:5},
 notice:{backgroundColor:"#10232D",borderRadius:15,padding:15,gap:7,marginTop:7},noticeTitle:{color:CYAN,fontSize:9,fontWeight:"900",letterSpacing:1.2},button:{backgroundColor:CYAN,borderRadius:14,padding:15,alignItems:"center",marginTop:5},buttonText:{color:"#07131B",fontSize:11,fontWeight:"900",letterSpacing:1},secondary:{borderWidth:1,borderColor:"#28505D",borderRadius:14,padding:15,alignItems:"center"},secondaryText:{color:"#C5D6DD",fontSize:11,fontWeight:"900",letterSpacing:1}
});
