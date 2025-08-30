import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useStorage } from "../hooks/useStorage";
import { User, ChecklistDraft, Evaluation } from "../config/types";
import { QUESTIONS } from "../config/questions";
import { toDateRefBR, nowInBrazil, formatDateTimeBR } from "../utils/time";
import { calcScore, uuid } from "../utils/calc";

interface ChecklistPageProps {
  currentUser: User;
  evaluatedUser: User;
  onSaved: () => void;
  accessibilityMode: boolean;
}

export function ChecklistPage({ currentUser, evaluatedUser, onSaved, accessibilityMode }: ChecklistPageProps) {
  const [draft, setDraft] = useState<ChecklistDraft>(() => ({
    evaluated: evaluatedUser.username,
    dateRef: toDateRefBR(),
    answers: Object.fromEntries(
      QUESTIONS.map(q => [q.id, { value: null, reason: "" }])
    )
  }));
  
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<"idle" | "sending" | "success">("idle");
  const [currentTime, setCurrentTime] = useState(() => nowInBrazil());
  const [invalidKeys, setInvalidKeys] = useState<Set<string>>(new Set());
  
  const storage = useStorage();

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(nowInBrazil()), 1000);
    return () => clearInterval(interval);
  }, []);

  const validate = (): string[] => {
    const errors: string[] = [];
    const invalid: string[] = [];
    
    for (const question of QUESTIONS) {
      const answer = draft.answers[question.id];
      
      if (answer.value === null) {
        errors.push(`Marque SIM/NÃO: ${question.text}`);
        invalid.push(question.id);
      }
      
      const needReason = (
        (question.requireReasonWhen === "yes" && answer.value === true) ||
        (question.requireReasonWhen === "no" && answer.value === false)
      );
      
      if (needReason && !answer.reason.trim()) {
        errors.push(`Descreva o motivo em: ${question.text}`);
        invalid.push(question.id);
      }
    }
    
    if (invalid.length) {
      setInvalidKeys(new Set(invalid));
      setTimeout(() => setInvalidKeys(new Set()), 800);
      
      const firstElement = document.getElementById(`question-${invalid[0]}`);
      firstElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    return errors;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validate();
    if (errors.length) return;
    
    setSaving(true);
    setPhase("sending");
    
    try {
      const answers = QUESTIONS.map(q => ({
        questionId: q.id,
        value: !!draft.answers[q.id].value,
        reason: draft.answers[q.id].reason.trim() || undefined
      }));
      
      const score = calcScore(answers, QUESTIONS);
      const brNow = nowInBrazil();
      const ref = toDateRefBR(brNow);
      
      const evaluation: Evaluation = {
        id: uuid(),
        createdAt: brNow.toISOString(),
        dateRef: ref,
        evaluator: currentUser.username,
        evaluated: evaluatedUser.username,
        answers,
        score,
        status: "queued"
      };
      
      // Check for existing evaluation
      const existingEvaluations = await storage.getEvaluations({
        evaluator: currentUser.username,
        evaluated: evaluatedUser.username,
        dateFrom: ref,
        dateTo: ref
      });
      
      if (existingEvaluations.length > 0) {
        alert("Já existe uma avaliação para este parceiro neste dia. Tente novamente amanhã.");
        setSaving(false);
        onSaved();
        return;
      }
      
      // Salvar direto no banco PostgreSQL para sincronização real
      try {
        const response = await fetch('/api/evaluations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(evaluation)
        });

        if (response.ok) {
          // Também salvar no localStorage como backup
          await storage.createEvaluation(evaluation);
          console.log("Avaliação salva no banco PostgreSQL e localStorage");
        } else {
          // Se falhar no banco, salvar apenas no localStorage
          await storage.createEvaluation(evaluation);
          console.log("Avaliação salva apenas no localStorage (offline)");
        }
      } catch (error) {
        // Em caso de erro de rede, salvar no localStorage
        await storage.createEvaluation(evaluation);
        console.log("Avaliação salva no localStorage (sem conexão)");
      }
      
      setPhase("success");
      setTimeout(() => {
        setSaving(false);
        onSaved();
      }, 900);
    } catch (error) {
      console.error("Error saving evaluation:", error);
      setSaving(false);
      setPhase("idle");
    }
  };

  const updateAnswer = (questionId: string, updates: Partial<typeof draft.answers[string]>) => {
    setDraft(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: { ...prev.answers[questionId], ...updates }
      }
    }));
  };

  const clearForm = () => {
    setDraft({
      evaluated: evaluatedUser.username,
      dateRef: toDateRefBR(),
      answers: Object.fromEntries(
        QUESTIONS.map(q => [q.id, { value: null, reason: "" }])
      )
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Card className={accessibilityMode ? 'accessibility-mode' : ''}>
        <CardContent className="pt-6">
          <div className="mb-4 text-center">
            <h2 className="text-xl font-semibold">Acompanhamento Diário</h2>
            <div className="text-sm text-gray-600">
              Avaliando: <strong data-testid="evaluated-name">{evaluatedUser.displayName}</strong> — {evaluatedUser.cargo || "Colaborador"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Data/Hora (Brasília): {formatDateTimeBR(currentTime)}
            </div>
          </div>
          
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {QUESTIONS.sort((a, b) => a.order - b.order).map(question => {
              const answer = draft.answers[question.id];
              const needReason = (
                (question.requireReasonWhen === "yes" && answer.value === true) ||
                (question.requireReasonWhen === "no" && answer.value === false)
              );
              const isInvalid = invalidKeys.has(question.id);
              
              return (
                <div
                  key={question.id}
                  id={`question-${question.id}`}
                  className={`border rounded-2xl p-3 ${isInvalid ? 'ring-2 ring-red-400 animate-pulse' : ''}`}
                  data-testid={`question-${question.id}`}
                >
                  <div className="font-medium">
                    {question.text} <span className="text-red-600">*</span>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant={answer.value === true ? "default" : "secondary"}
                      onClick={() => updateAnswer(question.id, { value: true })}
                      data-testid={`button-yes-${question.id}`}
                    >
                      SIM
                    </Button>
                    <Button
                      type="button"
                      variant={answer.value === false ? "default" : "secondary"}
                      onClick={() => updateAnswer(question.id, { value: false })}
                      data-testid={`button-no-${question.id}`}
                    >
                      NÃO
                    </Button>
                    <div className="text-xs text-gray-600">
                      {question.goodWhenYes ? "SIM é bom" : "NÃO é bom"}
                    </div>
                  </div>
                  
                  {needReason && (
                    <div className="mt-2">
                      <Label htmlFor={`reason-${question.id}`} className="text-sm font-medium">
                        Explique <span className="text-red-600">*</span>
                      </Label>
                      <Textarea
                        id={`reason-${question.id}`}
                        placeholder="Descreva o ocorrido"
                        value={answer.reason}
                        onChange={(e) => updateAnswer(question.id, { reason: e.target.value })}
                        className={`mt-1 min-h-[70px] ${
                          isInvalid && !answer.reason.trim() ? 'ring-2 ring-red-400' : ''
                        }`}
                        data-testid={`textarea-reason-${question.id}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={clearForm}
                data-testid="button-clear"
              >
                Limpar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                data-testid="button-submit"
              >
                {saving ? "Salvando..." : "Enviar"}
              </Button>
            </div>
          </form>

          {phase !== "idle" && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white border rounded-2xl p-6 text-center shadow-lg">
                {phase === "sending" ? (
                  <div className="mx-auto mb-2">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="mx-auto mb-2 h-10 w-10 rounded-full border-2 flex items-center justify-center">
                    ✓
                  </div>
                )}
                <div className="text-sm">
                  {phase === "sending" ? "Enviando..." : "Enviado com sucesso"}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
