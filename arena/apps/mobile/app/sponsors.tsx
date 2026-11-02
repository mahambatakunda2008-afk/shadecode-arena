import { ArenaSection } from "../src/components/ArenaSection";
export default function SponsorCentre() {
  return <ArenaSection eyebrow="SPONSOR CENTRE" title="Power the next event." intro="Give organisations a clear way to support players and fund great competitions." items={[
    {title:"Sponsor an event",description:"Fund free-entry competitions and publish the prize pool, eligibility and event dates.",status:"PLANNED"},
    {title:"Sponsor a season",description:"Support a longer competitive season with disclosed branding and measurable participation.",status:"PLANNED"},
    {title:"Partner reporting",description:"Receive event reach, completed matches and engagement reporting without exposing private player data.",status:"PLANNED"}
  ]} note="Sponsor funds and prize liabilities will be tracked separately from Arena revenue. Player data will not be sold." />;
}