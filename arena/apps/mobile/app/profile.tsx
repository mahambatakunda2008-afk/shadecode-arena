import { ArenaSection } from "../src/components/ArenaSection";
export default function PlayerProfile() {
  return <ArenaSection eyebrow="PLAYER PROFILE" title="Your game. Your record." intro="A player identity built around skill, progress and fair play." items={[
    {title:"Player identity",description:"Choose a handle, avatar and profile presentation.",status:"PLANNED"},
    {title:"Performance",description:"Track ranked results, personal bests, accuracy, streaks and improvement over time.",status:"PLANNED"},
    {title:"Achievements",description:"Earn milestones for practice, consistency, sportsmanship and tournament performance.",status:"PLANNED"},
    {title:"Fair-play record",description:"Competition history, verified results and transparent dispute outcomes.",status:"PLANNED"}
  ]} note="Cosmetics and membership will not increase scores, alter boards or provide a competitive advantage." />;
}