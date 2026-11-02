import { ArenaSection } from "../src/components/ArenaSection";
export default function Tournaments() {
  return <ArenaSection eyebrow="TOURNAMENT STUDIO" title="Bring people together." intro="A home for schools, clubs, communities and brands to run organised competitions." items={[
    {title:"School tournaments",description:"Create inter-class, inter-school and house competitions with brackets, schedules and standings.",status:"PLANNED"},
    {title:"Community events",description:"Host local competitions with public rules, moderation and transparent results.",status:"PLANNED"},
    {title:"Brand challenges",description:"Commission a sponsored event with clear branding, prize funding and participation terms.",status:"PLANNED"},
    {title:"Organiser tools",description:"Participant lists, match reporting, dispute handling, event analytics and downloadable results.",status:"PLANNED"}
  ]} note="Tournament hosting can be sold as an organiser service independently of whether a tournament uses paid player entry." />;
}