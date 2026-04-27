export const PHASES = [
  { id: 'grupos-j1', name: 'Fase de grupos - Jornada 1', status: 'abierta' },
  { id: 'grupos-j2', name: 'Fase de grupos - Jornada 2', status: 'proximamente' },
  { id: 'grupos-j3', name: 'Fase de grupos - Jornada 3', status: 'proximamente' },
  { id: 'ronda-32', name: 'Ronda de 32', status: 'proximamente' },
  { id: 'octavos', name: 'Octavos', status: 'proximamente' },
  { id: 'cuartos', name: 'Cuartos', status: 'proximamente' },
  { id: 'semifinales', name: 'Semifinales', status: 'proximamente' },
  { id: 'tercer-lugar', name: 'Tercer lugar', status: 'proximamente' },
  { id: 'final', name: 'Final', status: 'proximamente' }
];

export const MOCK_MATCHES = [
  {
    id: 'M-001',
    phase: 'grupos-j1',
    group: 'A',
    homeTeam: 'Equipo Norte',
    awayTeam: 'Equipo Sur',
    matchDate: '2026-06-11T18:00:00-06:00',
    status: 'programado',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'M-002',
    phase: 'grupos-j1',
    group: 'B',
    homeTeam: 'Equipo Este',
    awayTeam: 'Equipo Oeste',
    matchDate: '2026-06-11T21:00:00-06:00',
    status: 'programado',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'M-003',
    phase: 'grupos-j1',
    group: 'C',
    homeTeam: 'Atlético Central',
    awayTeam: 'Costa Dorada',
    matchDate: '2026-06-12T17:00:00-06:00',
    status: 'programado',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'M-004',
    phase: 'grupos-j1',
    group: 'D',
    homeTeam: 'Valle Unido',
    awayTeam: 'Río FC',
    matchDate: '2026-06-12T20:00:00-06:00',
    status: 'programado',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'M-005',
    phase: 'octavos',
    group: '-',
    homeTeam: '1A',
    awayTeam: '2B',
    matchDate: '2026-06-29T19:00:00-06:00',
    status: 'programado',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'M-006',
    phase: 'final',
    group: '-',
    homeTeam: 'Ganador SF1',
    awayTeam: 'Ganador SF2',
    matchDate: '2026-07-19T19:00:00-06:00',
    status: 'programado',
    homeScore: null,
    awayScore: null
  }
];

export const MOCK_RANKING = [
  { participantFolio: 'BM26-000184', name: 'Ricardo D.', totalPoints: 45, exactScores: 5 },
  { participantFolio: 'BM26-000092', name: 'Ana M.', totalPoints: 41, exactScores: 4 },
  { participantFolio: 'BM26-000211', name: 'Luis R.', totalPoints: 39, exactScores: 4 }
];
