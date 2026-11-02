import { ArenaSection } from "../src/components/ArenaSection";
export default function ArenaStore() {
  return <ArenaSection eyebrow="ARENA STORE" title="Make it yours." intro="Optional ways to personalise the experience. Nothing in the store changes game outcomes or competitive power." items={[
    {title:"Tile themes",description:"Board palettes and visual themes that keep tiles readable and accessible.",status:"PLANNED"},
    {title:"Player cosmetics",description:"Profile frames, badges, titles and celebration effects.",status:"PLANNED"},
    {title:"Arena membership",description:"An optional supporter membership for profile customisation, extra stats and community perks. No gameplay advantage.",status:"PLANNED"}
  ]} note="No purchases are active. Cosmetic items and membership will be clearly priced and never required to compete." />;
}