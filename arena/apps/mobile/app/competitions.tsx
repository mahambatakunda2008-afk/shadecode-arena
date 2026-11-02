import { ArenaSection } from "../src/components/ArenaSection";
export default function Competitions() {
  return <ArenaSection eyebrow="COMPETITION HUB" title="Find your arena." intro="Choose how you want to compete. Every event must be fair, transparent and clear about its rules before you enter." items={[
    {title:"Open practice events",description:"Free-to-enter challenges for learning the game, building consistency and finding your level.",status:"FREE"},
    {title:"Ranked skill competitions",description:"Structured entry-based competitions with published scoring, eligibility, fees and prize rules. These stay unavailable until local legal and payment-provider clearance is complete.",status:"CLEARANCE GATE"},
    {title:"Sponsor-funded events",description:"Free player entry, with prizes funded by a disclosed sponsor and event rules shown up front.",status:"PLANNED"},
    {title:"Season ladders",description:"Longer-running leaderboards that reward consistency, not purchases or paid boosts.",status:"PLANNED"}
  ]} note="No deposits, cash wallet or payouts are enabled in this build. Paid competitions will only activate in jurisdictions and through providers where the model has been properly cleared." />;
}