import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { useStorage } from "../hooks/useStorage";
import { User, Evaluation } from "../config/types";
import { QUESTIONS } from "../config/questions";
import { CONFIG } from "../config/constants";
import { toDateRefBR, formatDateTimeBRdash } from "../utils/time";

export function DashboardPage() {
  const [dateFrom, setDateFrom] = useState(toDateRefBR());
  const [dateTo, setDateTo] = useState(toDateRefBR());
  const [selectedUser, setSelectedUser] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const storage = useStorage();

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo, selectedUser]);

  const loadData = async () => {
    const [allEvaluations, allUsers] = await Promise.all([
      storage.getEvaluations({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        evaluated: selectedUser || undefined
      }),
      storage.getUsers()
    ]);
    
    setEvaluations(allEvaluations);
    setUsers(allUsers);
  };

  const stats = useMemo(() => {
    // Top performers by average score
    const userStats = new Map<string, { count: number; scoreSum: number }>();
    
    evaluations.forEach(evaluation => {
      const current = userStats.get(evaluation.evaluated) || { count: 0, scoreSum: 0 };
      current.count += 1;
      current.scoreSum += evaluation.score;
      userStats.set(evaluation.evaluated, current);
    });
    
    const topPerformers = Array.from(userStats.entries())
      .map(([username, stats]) => ({
        username,
        average: stats.scoreSum / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);

    return { topPerformers };
  }, [evaluations]);

  const alerts = useMemo(() => {
    const problemsByUserAndQuestion = new Map<string, { bad: number; total: number }>();
    
    evaluations.forEach(evaluation => {
      evaluation.answers.forEach(answer => {
        const question = QUESTIONS.find(q => q.id === answer.questionId);
        if (!question) return;
        
        const key = `${evaluation.evaluated}|${answer.questionId}`;
        const stats = problemsByUserAndQuestion.get(key) || { bad: 0, total: 0 };
        
        stats.total += 1;
        if (answer.value !== question.goodWhenYes) {
          stats.bad += 1;
        }
        
        problemsByUserAndQuestion.set(key, stats);
      });
    });
    
    return Array.from(problemsByUserAndQuestion.entries())
      .map(([key, stats]) => {
        const [username, questionId] = key.split("|");
        const percentage = stats.total > 0 ? stats.bad / stats.total : 0;
        return {
          username,
          questionId,
          percentage,
          total: stats.total
        };
      })
      .filter(alert => alert.percentage >= CONFIG.alertThreshold)
      .sort((a, b) => b.percentage - a.percentage);
  }, [evaluations]);

  const exportCSV = () => {
    const headers = [
      "id", "createdAt", "dateRef", "evaluator", "evaluated", "score",
      ...QUESTIONS.flatMap(q => [`${q.id}_value`, `${q.id}_reason`])
    ];
    
    const rows = evaluations.map(evaluation => {
      const row: any[] = [
        evaluation.id,
        evaluation.createdAt,
        evaluation.dateRef,
        evaluation.evaluator,
        evaluation.evaluated,
        evaluation.score
      ];
      
      QUESTIONS.forEach(question => {
        const answer = evaluation.answers.find(a => a.questionId === question.id);
        row.push(answer ? (answer.value ? "SIM" : "NÃO") : "");
        row.push(answer?.reason || "");
      });
      
      return row;
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "avaliacoes.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const simulateSync = async () => {
    const updatedEvaluations = evaluations.map(evaluation => ({
      ...evaluation,
      status: "synced" as const
    }));
    
    await storage.setEvaluations(updatedEvaluations);
    await loadData();
    alert(`Sincronizados: ${evaluations.length} registros`);
  };

  const getUserDisplayName = (username: string) => {
    return users.find(u => u.username === username)?.displayName || username;
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total de avaliações</div>
            <div className="text-2xl font-semibold" data-testid="stat-total-evaluations">
              {evaluations.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Colaboradores avaliados</div>
            <div className="text-2xl font-semibold" data-testid="stat-unique-evaluated">
              {new Set(evaluations.map(e => e.evaluated)).size}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Exportação</div>
            <div className="mt-2 flex gap-2">
              <Button onClick={exportCSV} data-testid="button-export-csv">
                CSV
              </Button>
              <Button variant="secondary" onClick={simulateSync} data-testid="button-sync">
                Simular Sync
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor="date-from">De</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            
            <div>
              <Label htmlFor="date-to">Até</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="user-filter">Filtrar por colaborador (avaliado)</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger data-testid="select-user-filter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {users
                    .filter(u => u.role === "colaborador")
                    .map(user => (
                      <SelectItem key={user.username} value={user.username}>
                        {user.displayName}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">
              Média por colaborador (top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topPerformers.map(performer => (
                <div 
                  key={performer.username}
                  className="flex items-center justify-between"
                  data-testid={`top-performer-${performer.username}`}
                >
                  <div className="text-sm">
                    {getUserDisplayName(performer.username)}
                  </div>
                  <Badge>{performer.average.toFixed(2)}</Badge>
                </div>
              ))}
              {stats.topPerformers.length === 0 && (
                <div className="text-sm text-gray-600">—</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">
              Alertas (≥ {Math.round(CONFIG.alertThreshold * 100)}%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map(alert => {
                const question = QUESTIONS.find(q => q.id === alert.questionId);
                return (
                  <div
                    key={`${alert.username}-${alert.questionId}`}
                    className="flex items-center justify-between border rounded-xl px-3 py-2"
                    data-testid={`alert-${alert.username}-${alert.questionId}`}
                  >
                    <div className="text-sm">
                      <strong>{getUserDisplayName(alert.username)}</strong> — {question?.text}
                    </div>
                    <Badge>
                      {Math.round(alert.percentage * 100)}% ({alert.total})
                    </Badge>
                  </div>
                );
              })}
              {alerts.length === 0 && (
                <div className="text-sm text-gray-600">
                  Sem alertas no período.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Tabela detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Data</th>
                  <th className="py-2 pr-2">Avaliador</th>
                  <th className="py-2 pr-2">Avaliado</th>
                  <th className="py-2 pr-2">Score</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Respostas</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map(evaluation => (
                  <tr key={evaluation.id} className="border-b" data-testid={`evaluation-row-${evaluation.id}`}>
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {formatDateTimeBRdash(new Date(evaluation.createdAt))}
                    </td>
                    <td className="py-2 pr-2">
                      {getUserDisplayName(evaluation.evaluator)}
                    </td>
                    <td className="py-2 pr-2">
                      {getUserDisplayName(evaluation.evaluated)}
                    </td>
                    <td className="py-2 pr-2">{evaluation.score}</td>
                    <td className="py-2 pr-2">
                      {evaluation.status === "synced" ? "Sincronizado" : 
                       evaluation.status === "queued" ? "Pendente" : 
                       evaluation.status}
                    </td>
                    <td className="py-2 pr-2">
                      {evaluation.answers.map(answer => {
                        const question = QUESTIONS.find(q => q.id === answer.questionId);
                        return (
                          <div key={answer.questionId}>
                            <strong>{question?.order}.</strong> {answer.value ? "SIM" : "NÃO"}
                            {answer.reason && <> — <em>{answer.reason}</em></>}
                          </div>
                        );
                      })}
                    </td>
                  </tr>
                ))}
                {evaluations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-600">
                      Sem registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
