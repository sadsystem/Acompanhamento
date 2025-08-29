import { Question } from './types';

export const QUESTIONS: Question[] = [
  {
    id: "pontualidade",
    text: "Chegou dentro do horário estipulado?",
    order: 1,
    goodWhenYes: true,
    requireReasonWhen: "no"
  },
  {
    id: "conduta",
    text: "Foi educado e prestativo nas atividades de hoje?",
    order: 2,
    goodWhenYes: true,
    requireReasonWhen: "no"
  },
  {
    id: "desvio_rota",
    text: "Houve desvio de rota ao longo do dia?",
    order: 3,
    goodWhenYes: false,
    requireReasonWhen: "yes"
  },
  {
    id: "avaria",
    text: "Causou alguma avaria ao manusear os produtos?",
    order: 4,
    goodWhenYes: false,
    requireReasonWhen: "yes"
  },
];
