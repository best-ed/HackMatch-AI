import type { Participant } from "@/lib/matching/types";
import { defaultMatchingSettings } from "@/lib/matching/types";

const now = "2026-05-24T09:00:00.000Z";

function p(
  id: string,
  fullName: string,
  experienceLevel: Participant["experienceLevel"],
  primaryRole: string,
  secondaryRoles: string[],
  technicalSkills: string[],
  nonTechnicalSkills: string[],
  tools: string[],
  interests: string[],
  availability: Participant["availability"],
  preferredTeammates: string[] = [],
  blockedTeammates: string[] = [],
  consentToMatch = true
): Participant {
  return {
    id,
    fullName,
    email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: "+1 555 0100",
    institution: ["State University", "Metro College", "Indie Hacker Lab", "Design Institute"][
      Number(id.replace("p", "")) % 4
    ],
    githubUrl: `https://github.com/${id}`,
    linkedinUrl: `https://linkedin.com/in/${id}`,
    portfolioUrl: `https://portfolio.example.com/${id}`,
    experienceLevel,
    primaryRole,
    secondaryRoles,
    technicalSkills,
    nonTechnicalSkills,
    tools,
    interests,
    projectIdeas: `A practical ${interests[0]} project with a strong demo loop.`,
    preferredTeamSize: 4,
    preferredTeammates,
    blockedTeammates,
    availability,
    personalStatement: `I want to ship a useful prototype and learn from a balanced team.`,
    consentToMatch,
    consentToShareContact: Number(id.replace("p", "")) % 3 !== 0,
    createdAt: now,
    updatedAt: now
  };
}

export const demoParticipants: Participant[] = [
  p("p01", "Avery Chen", "advanced", "Full Stack", ["Presenter"], ["React", "Node", "PostgreSQL"], ["mentoring"], ["Next.js", "Supabase"], ["health", "accessibility"], ["weekday_evening", "weekend_morning"], ["p08"]),
  p("p02", "Maya Patel", "intermediate", "Designer", ["Product"], ["HTML", "CSS"], ["research", "storytelling"], ["Figma", "Notion"], ["education", "accessibility"], ["weekday_evening", "weekend_afternoon"]),
  p("p03", "Jordan Lee", "beginner", "Presenter", ["Marketing"], ["Canva"], ["public speaking", "copywriting"], ["Pitch"], ["climate", "community"], ["weekend_afternoon", "weekend_evening"]),
  p("p04", "Sam Rivera", "advanced", "Backend", ["Data"], ["Python", "APIs", "SQL"], ["systems thinking"], ["FastAPI", "Docker"], ["fintech", "security"], ["weekday_evening", "weekend_morning"]),
  p("p05", "Nia Okafor", "intermediate", "Data", ["AI"], ["Python", "Pandas", "ML"], ["analysis"], ["Jupyter", "Hugging Face"], ["health", "AI"], ["weekday_afternoon", "weekend_morning"]),
  p("p06", "Leo Martinez", "beginner", "Frontend", ["Designer"], ["React", "CSS"], ["visual design"], ["Figma", "Vercel"], ["music", "creator tools"], ["weekend_morning", "weekend_afternoon"], [], ["p14"]),
  p("p07", "Priya Shah", "advanced", "Product", ["Presenter"], ["Analytics"], ["roadmapping", "pitching"], ["Miro", "Linear"], ["education", "civic tech"], ["weekday_evening", "weekend_evening"]),
  p("p08", "Noah Kim", "intermediate", "Backend", ["Full Stack"], ["TypeScript", "Prisma", "PostgreSQL"], ["debugging"], ["Next.js", "Docker"], ["health", "logistics"], ["weekday_evening", "weekend_morning"], ["p01"]),
  p("p09", "Elena Garcia", "beginner", "Designer", ["Presenter"], ["CSS"], ["user interviews", "branding"], ["Figma"], ["food", "community"], ["weekend_afternoon", "weekend_evening"]),
  p("p10", "Marcus Brown", "advanced", "AI", ["Backend"], ["Python", "LLMs", "Vector Search"], ["technical writing"], ["OpenAI", "Supabase"], ["AI", "education"], ["weekday_evening", "weekend_afternoon"]),
  p("p11", "Ivy Thompson", "intermediate", "Frontend", ["Product"], ["React", "TypeScript"], ["facilitation"], ["Next.js", "Figma"], ["climate", "maps"], ["weekday_afternoon", "weekend_morning"]),
  p("p12", "Owen Wilson", "beginner", "Product", ["Presenter"], ["Spreadsheets"], ["customer discovery", "pitching"], ["Notion"], ["fintech", "small business"], ["weekend_morning", "weekend_evening"]),
  p("p13", "Fatima Ali", "advanced", "Designer", ["Frontend"], ["Design Systems", "CSS"], ["research", "prototyping"], ["Figma", "Storybook"], ["accessibility", "health"], ["weekday_evening", "weekend_morning"]),
  p("p14", "Ben Carter", "intermediate", "Backend", ["Data"], ["Go", "SQL", "APIs"], ["documentation"], ["Docker", "Postgres"], ["security", "civic tech"], ["weekend_morning", "weekend_afternoon"], [], ["p06"]),
  p("p15", "Zara Hassan", "beginner", "Presenter", ["Product"], ["No-code"], ["sales", "storytelling"], ["Canva", "Notion"], ["creator tools", "music"], ["weekday_evening", "weekend_evening"]),
  p("p16", "Theo Nguyen", "advanced", "Full Stack", ["AI"], ["React", "Python", "LLMs"], ["mentoring"], ["Next.js", "OpenAI"], ["AI", "accessibility"], ["weekday_evening", "weekend_afternoon"]),
  p("p17", "Grace Miller", "intermediate", "Data", ["Product"], ["R", "Python", "Dashboards"], ["analysis"], ["Tableau", "Jupyter"], ["climate", "maps"], ["weekday_afternoon", "weekend_morning"]),
  p("p18", "Kofi Mensah", "beginner", "Frontend", ["Presenter"], ["JavaScript", "CSS"], ["public speaking"], ["Vercel"], ["sports", "community"], ["weekend_afternoon", "weekend_evening"]),
  p("p19", "Hannah Park", "advanced", "Product", ["Designer"], ["SQL", "Analytics"], ["strategy", "research"], ["Miro", "Figma"], ["logistics", "small business"], ["weekday_evening", "weekend_morning"]),
  p("p20", "Dante Brooks", "intermediate", "Backend", ["AI"], ["Node", "APIs", "Queues"], ["security review"], ["Supabase", "Redis"], ["security", "fintech"], ["weekday_evening", "weekend_evening"]),
  p("p21", "Lina Torres", "beginner", "Designer", ["Product"], ["Wireframes"], ["research", "copywriting"], ["Figma"], ["education", "community"], ["weekend_morning", "weekend_afternoon"]),
  p("p22", "Ravi Singh", "advanced", "Data", ["Backend"], ["Python", "ML", "SQL"], ["experimentation"], ["Jupyter", "Docker"], ["health", "AI"], ["weekday_afternoon", "weekend_morning"]),
  p("p23", "Amelia Reed", "intermediate", "Presenter", ["Product"], ["Analytics"], ["pitching", "partnerships"], ["Slides", "Notion"], ["civic tech", "climate"], ["weekday_evening", "weekend_evening"]),
  p("p24", "Chris Morgan", "beginner", "Frontend", ["Designer"], ["React", "Tailwind"], ["visual QA"], ["Vercel", "Figma"], ["food", "small business"], ["weekend_morning", "weekend_evening"]),
  p("p25", "Sofia Rossi", "advanced", "Designer", ["Presenter"], ["Design Systems"], ["storytelling", "research"], ["Figma", "Framer"], ["creator tools", "accessibility"], ["weekday_evening", "weekend_afternoon"]),
  p("p26", "Malik Johnson", "intermediate", "Full Stack", ["Backend"], ["TypeScript", "Node", "SQL"], ["planning"], ["Next.js", "Prisma"], ["logistics", "fintech"], ["weekday_evening", "weekend_morning"]),
  p("p27", "Emily Davis", "beginner", "Product", ["Designer"], ["Market research"], ["facilitation", "copywriting"], ["Miro", "Notion"], ["education", "health"], ["weekend_afternoon", "weekend_evening"]),
  p("p28", "Kenji Sato", "advanced", "Backend", ["Full Stack"], ["Rust", "APIs", "PostgreSQL"], ["architecture"], ["Docker", "Supabase"], ["security", "logistics"], ["weekday_evening", "weekend_morning"]),
  p("p29", "Aisha Bello", "intermediate", "AI", ["Presenter"], ["Python", "Prompting", "Evaluation"], ["technical demos"], ["OpenAI", "Jupyter"], ["AI", "education"], ["weekday_afternoon", "weekend_afternoon"]),
  p("p30", "Tyler Evans", "beginner", "Frontend", ["Product"], ["HTML", "CSS", "JavaScript"], ["testing"], ["GitHub", "Vercel"], ["sports", "community"], ["weekend_morning", "weekend_evening"], [], [], false)
];

export const demoMatchingSettings = {
  ...defaultMatchingSettings,
  desiredTeamSize: 4,
  minTeamSize: 3,
  maxTeamSize: 5
};
