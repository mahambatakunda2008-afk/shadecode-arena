import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CYAN = "#39D8E8";
type Item = { title: string; description: string; status?: string };
type Props = { eyebrow: string; title: string; intro: string; items: Item[]; note?: string };

export function ArenaSection({ eyebrow, title, intro, items, note }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Link href="/" asChild><Pressable><Text style={styles.back}>‹  ARENA HOME</Text></Pressable></Link>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.intro}>{intro}</Text>
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.title} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.status ? <Text style={styles.status}>{item.status}</Text> : null}
              </View>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          ))}
        </View>
        {note ? <View style={styles.note}><Text style={styles.noteText}>{note}</Text></View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#07131B"},
  content:{padding:22,paddingBottom:42,gap:16},
  back:{color:CYAN,fontSize:11,fontWeight:"900",letterSpacing:1.2,marginBottom:16},
  eyebrow:{color:CYAN,fontSize:10,fontWeight:"900",letterSpacing:1.7},
  title:{color:"#F4FAFC",fontSize:34,fontWeight:"900",letterSpacing:-0.8},
  intro:{color:"#A6B9C2",fontSize:14,lineHeight:22,marginBottom:8},
  list:{gap:11},
  card:{backgroundColor:"#10232D",borderWidth:1,borderColor:"#1D3A47",borderRadius:17,padding:16,gap:8},
  row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},
  cardTitle:{color:"#F4FAFC",fontSize:15,fontWeight:"800",flex:1},
  status:{color:CYAN,fontSize:9,fontWeight:"900",letterSpacing:0.8,borderWidth:1,borderColor:"#205461",borderRadius:20,paddingHorizontal:9,paddingVertical:5,overflow:"hidden"},
  description:{color:"#A6B9C2",fontSize:12,lineHeight:19},
  note:{backgroundColor:"#0D202A",borderRadius:13,padding:14,marginTop:6},
  noteText:{color:"#91A8B2",fontSize:11,lineHeight:18}
});
