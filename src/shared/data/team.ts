export type TeamMember = {
  name: string;
  role: string;
  curseForgeUrl?: string;
  modrinthUrl?: string;
  githubUrl?: string;
  retiredSince?: number;
  retirementReason?: string;
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Raijin',
    role: 'Владелец & Майнкрафт моддер',
    curseForgeUrl: 'https://www.curseforge.com/members/raijin2312/projects',
    modrinthUrl: 'https://modrinth.com/user/Raijin2312',
    githubUrl: 'https://github.com/Reijin2312',
  },
  { name: 'Kelbor_Hal', role: 'Мл. Админ' },
  {
    name: 'Wolle',
    role: 'Тех. Админ',
    retiredSince: 2025,
    retirementReason: 'Вышел из-за смены хоста',
  },
  { name: 'Sile_Scorp', role: 'Дизайнер' },
  { name: 'Explyp', role: 'Python-программист' },
];

export const TEAM_AVATAR_FALLBACK = '/images/avatar-fallback.png';

