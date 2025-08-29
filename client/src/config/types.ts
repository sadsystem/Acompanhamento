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

export type Route = "login" | "selectPartner" | "checklist" | "dashboard" | "admin";

export type ChecklistDraft = {
  evaluated?: string;
  answers: Record<string, { value: boolean | null; reason: string }>;
  dateRef: string;
};
