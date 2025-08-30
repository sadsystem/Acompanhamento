export const CONFIG = {
  appName: "Acompanhamento Diário - Ouro Verde",
  version: "0.81a",
  alertThreshold: 0.3,
} as const;

export const LS_KEYS = {
  users: "sad_users",
  session: "sad_session",
  evaluations: "sad_evals",
  remember: "sad_remember",
  teams: "sad_teams",
  travelRoutes: "sad_travel_routes",
  vehicles: "sad_vehicles",
} as const;

export const ROUTES = {
  LOGIN: "login",
  SELECT_PARTNER: "selectPartner",
  CHECKLIST: "checklist",
  DASHBOARD: "dashboard",
  ADMIN: "admin",
} as const;

export const COLORS = {
  primary: "hsl(221.2 83.2% 53.3%)",
  secondary: "hsl(210 40% 96%)",
  accent: "hsl(142.1 76.2% 36.3%)",
  destructive: "hsl(0 84.2% 60.2%)",
  muted: "hsl(210 40% 96%)",
  border: "hsl(214.3 31.8% 91.4%)",
} as const;
