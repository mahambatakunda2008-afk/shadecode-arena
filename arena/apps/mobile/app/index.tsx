import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const CYAN = "#39D8E8";
const links = [
  { href: "/competitions", tag: "COMPETE", title: "Competition Hub", copy: "Free events, sponsored challenges and ranked skill competitions." },
  { href: "/tournaments", tag: "HOST", title: "Tournament Studio", copy: "Events for schools, clubs, communities and brands." },
  { href: "/sponsors", tag: "PARTNER", title: "Sponsor Centre", copy: "Fund free-entry events and support players." },
  { href: "/store", tag: "PERSONALISE", title: "Arena Store", copy: "Optional cosmetics and membership. Never pay-to-win." },
  { href: "/profile", tag: "PLAYER", title: "Player Profile", copy: "Your local progress, achievements and game records." }
] as const;
export default function ArenaHome() {
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <View style={s.top}><Text style={s.brand}>SHADECODE <Text style={{color:CYAN}}>ARENA</Text></Text><Text style={s.pill}>BETA</Text></View>
    <View style={s.hero}><Text style={s.kicker}>PLAY. IMPROVE. COMPETE.</Text><Text style={s.title}>Your next{"\n"}move matters.</Text><Text style={s.subtitle}>A home for quick games, fair competition and skill that speaks for itself.</Text></View>
    <Text style={s.label}>PLAY NOW</Text>
    <Link href="/tile-rush" asChild><Pressable style={s.game}><Text style={s.gameIcon}>✣</Text><View style={{flex:1,gap:5}}><Text style={s.gameTitle}>Shade Tiles: Rush</Text><Text style={s.copy}>Match, chain, clear. Make every move count.</Text><Text style={s.meta}>PUZZLE · OFFLINE PRACTICE MODES</Text></View><Text style={s.arrow}>›</Text></Pressable></Link>
    <Link href="/circuit-breaker" asChild><Pressable style={s.game}><Text style={[s.gameIcon,{color:"#69D391",backgroundColor:"#153B34"}]}>⌁</Text><View style={{flex:1,gap:5}}><Text style={s.gameTitle}>Circuit Breaker</Text><Text style={s.copy}>Rotate the wires. Complete the route. Power up.</Text><Text style={[s.meta,{color:"#69D391"}]}>LOGIC PUZZLE · OFFLINE</Text></View><Text style={s.arrow}>›</Text></Pressable></Link>\n    <Text style={s.label}>EXPLORE ARENA</Text>
    {links.map(x=><Link key={x.href} href={x.href} asChild><Pressable style={s.card}><View style={{flex:1,gap:4}}><Text style={s.tag}>{x.tag}</Text><Text style={s.cardTitle}>{x.title}</Text><Text style={s.copy}>{x.copy}</Text></View><Text style={s.arrow}>›</Text></Pressable></Link>)}
    <View style={s.note}><Text style={s.tag}>FAIR BY DESIGN</Text><Text style={s.copy}>No pay-to-win. No paid gameplay advantages. Paid-entry competitions remain locked until local legal and payment clearance is complete.</Text></View>
    <Text style={s.footer}>BUILT FOR PLAYERS · BUILT TO COMPETE</Text>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:"#07131B"},content:{padding:22,paddingBottom:38,gap:15},
 top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},brand:{color:"#F4FAFC",fontSize:13,fontWeight:"900",letterSpacing:2},pill:{color:CYAN,borderColor:"#205461",borderWidth:1,borderRadius:20,paddingHorizontal:10,paddingVertical:4,fontSize:10,fontWeight:"800"},
 hero:{paddingTop:24,paddingBottom:7,gap:12},kicker:{color:CYAN,fontSize:11,fontWeight:"800",letterSpacing:2},title:{color:"#F4FAFC",fontSize:46,lineHeight:49,fontWeight:"900",letterSpacing:-1.5},subtitle:{color:"#9FB2BC",fontSize:15,lineHeight:23,maxWidth:310},
 label:{color:"#6F8792",fontSize:10,fontWeight:"800",letterSpacing:2,marginTop:5},
 game:{backgroundColor:"#10232D",borderColor:"#1D3A47",borderWidth:1,borderRadius:22,padding:17,flexDirection:"row",alignItems:"center",gap:14},gameIcon:{width:54,height:54,borderRadius:16,backgroundColor:"#123A46",textAlign:"center",textAlignVertical:"center",color:CYAN,fontSize:34,overflow:"hidden"},gameTitle:{color:"#F4FAFC",fontSize:19,fontWeight:"800"},copy:{color:"#A6B9C2",fontSize:12,lineHeight:18},meta:{color:CYAN,fontSize:9,fontWeight:"800",letterSpacing:1,marginTop:4},arrow:{color:CYAN,fontSize:28},
 card:{backgroundColor:"#0D202A",borderColor:"#183541",borderWidth:1,borderRadius:16,padding:15,flexDirection:"row",alignItems:"center",gap:12},tag:{color:CYAN,fontSize:9,fontWeight:"900",letterSpacing:1.4},cardTitle:{color:"#F4FAFC",fontSize:15,fontWeight:"800"},note:{backgroundColor:"#10232D",borderRadius:15,padding:15,gap:7},footer:{textAlign:"center",color:"#5F7883",fontSize:9,fontWeight:"800",letterSpacing:1.5,paddingTop:5}
});
