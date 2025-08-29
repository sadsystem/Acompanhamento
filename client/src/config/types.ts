export type Role = "admin" | "colaborador";

export type User = {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: Role;
  active: boolean;
  cargo?: string;
  cpf?: string;
};

export type Question = {
  id: string;
  text: string;
  order: number;
  goodWhenYes: boolean;
  requireReasonWhen: "yes" | "no" | "never";
};

export type Answer = {
  questionId: string;
  value: boolean;
  reason?: string;
};

export type Evaluation = {
  id: string;
  createdAt: string;
  dateRef: string;
  evaluator: string;
  evaluated: string;
  answers: Answer[];
  score: number;
  status: "queued" | "synced";
};

export type Session = {
  username: string;
  token?: string;
};

export type EvaluationFilters = {
  dateFrom?: string;
  dateTo?: string;
  evaluator?: string;
  evaluated?: string;
  status?: string;
};

export type LoginResult = {
  ok: boolean;
  error?: string;
  user?: User;
};

export type AppRoute = "login" | "selectPartner" | "checklist" | "dashboard" | "admin" | "teamBuilder";

export type ChecklistDraft = {
  evaluated?: string;
  answers: Record<string, { value: boolean | null; reason: string }>;
  dateRef: string;
};

export type Team = {
  id: string;
  driverUsername: string;
  assistants: string[]; // max 2 assistants
  createdAt?: string;
  updatedAt?: string;
};

export type TravelRoute = {
  id: string;
  city: string;
  teamId?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD when completed
  status: "active" | "completed";
  createdAt?: string;
  updatedAt?: string;
};

export type TeamWithMembers = Team & {
  driver: User;
  assistantUsers: User[];
};

export type TravelRouteWithTeam = TravelRoute & {
  team?: TeamWithMembers;
};
