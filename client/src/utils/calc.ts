import { Answer, Question } from '../config/types';

export function calcScore(answers: Answer[], questions: Question[]): number {
  const questionMap = new Map(questions.map(q => [q.id, q]));
  let good = 0;
  
  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;
    
    if (answer.value === question.goodWhenYes) {
      good += 1;
    }
  }
  
  const total = questions.length || 1;
  return Number((good / total).toFixed(2));
}

export function uuid(): string {
  const crypto = (globalThis as any)?.crypto;
  return (crypto && typeof crypto.randomUUID === "function") 
    ? crypto.randomUUID() 
    : Math.random().toString(36).slice(2);
}
