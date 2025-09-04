import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from "recharts";
import { TrendingUp, TrendingDown, Users, Calendar, AlertTriangle, Award, Target, Activity, CalendarDays, CalendarRange } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { useStorage } from "../hooks/useStorage";
import { User, Evaluation } from "../config/types";
import { QUESTIONS } from "../config/questions";
import { CONFIG } from "../config/constants";
import { toDateRefBR, formatDateTimeBRdash, getDefaultDashboardPeriod, getDateRangeBR } from "../utils/time";

type PeriodOption = {
  label: string;
  days: number;
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: 'Hoje', days: 0 },
  { label: '7 Dias', days: 7 },
  { label: '15 Dias', days: 15 },
  { label: '30 Dias', days: 30 },
];

export function DashboardPage() {
  // Período padrão: últimos 7 dias
  const defaultPeriod = getDefaultDashboardPeriod();
  const [dateFrom, setDateFrom] = useState(defaultPeriod.from);
  const [dateTo, setDateTo] = useState(defaultPeriod.to);
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7); // 7 dias como padrão
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const storage = useStorage();

  // Função para aplicar período pré-definido
  const applyPeriod = (days: number) => {
    if (days === 0) {
      // Hoje
      const today = toDateRefBR();
      setDateFrom(today);
      setDateTo(today);
    } else {
      // Período de N dias
      const range = getDateRangeBR(days);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
    setSelectedPeriod(days);
  };

  useEffect(() => {
    loadData();
  }, [dateFrom, dateTo, selectedUser]);

  const loadData = async () => {
    const [allEvaluations, allUsers] = await Promise.all([
      storage.getEvaluations({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        evaluated: selectedUser === "all" ? undefined : selectedUser
      }),
      storage.getUsers()
    ]);
    
    setEvaluations(allEvaluations);
    setUsers(allUsers);
  };

  const stats = useMemo(() => {
    if (evaluations.length === 0) {
      return {
        totalEvaluations: 0,
        uniqueUsers: 0,
        averageScore: 0,
        topPerformers: [],
        performanceByCategory: [],
        weeklyTrend: [],
        distributionData: [],
        individualStats: new Map()
      };
    }

    // Estatísticas gerais
    const totalEvaluations = evaluations.length;
    const uniqueUsers = new Set(evaluations.map(e => e.evaluated)).size;
    const averageScore = (evaluations.reduce((sum, e) => sum + e.score, 0) / totalEvaluations) * 100;

    // Top performers por média
    const userStats = new Map<string, { count: number; scoreSum: number; categories: Record<string, { good: number; total: number }> }>();
    
    evaluations.forEach(evaluation => {
      const current = userStats.get(evaluation.evaluated) || { 
        count: 0, 
        scoreSum: 0, 
        categories: Object.fromEntries(QUESTIONS.map(q => [q.id, { good: 0, total: 0 }]))
      };
      
      current.count += 1;
      current.scoreSum += evaluation.score * 100; // Converter para porcentagem
      
      // Performance por categoria
      evaluation.answers.forEach(answer => {
        const question = QUESTIONS.find(q => q.id === answer.questionId);
        if (question) {
          current.categories[question.id].total += 1;
          if (answer.value === question.goodWhenYes) {
            current.categories[question.id].good += 1;
          }
        }
      });
      
      userStats.set(evaluation.evaluated, current);
    });
    
    const topPerformers = Array.from(userStats.entries())
      .map(([username, stats]) => ({
        username,
        average: stats.scoreSum / stats.count,
        count: stats.count,
        categories: stats.categories
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5);

    // Performance por categoria (geral)
    const performanceByCategory = QUESTIONS.map(question => {
      const categoryAnswers = evaluations.flatMap(e => 
        e.answers.filter(a => a.questionId === question.id)
      );
      const goodAnswers = categoryAnswers.filter(a => a.value === question.goodWhenYes).length;
      const percentage = categoryAnswers.length > 0 ? (goodAnswers / categoryAnswers.length) * 100 : 0;
      
      return {
        name: question.text.slice(0, 25) + '...',
        fullName: question.text,
        percentage,
        good: goodAnswers,
        total: categoryAnswers.length
      };
    });

    // Trend semanal
    const weeklyTrend = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEvaluations = evaluations.filter(e => e.dateRef === dateStr);
      const avgScore = dayEvaluations.length > 0 
        ? (dayEvaluations.reduce((sum, e) => sum + e.score, 0) / dayEvaluations.length) * 100
        : 0;
      
      weeklyTrend.push({
        date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        score: Number(avgScore.toFixed(2)),
        count: dayEvaluations.length
      });
    }

    // Distribuição de scores
    const scoreRanges = [
      { range: '0-20%', min: 0, max: 20, count: 0, color: '#ef4444' },
      { range: '21-40%', min: 21, max: 40, count: 0, color: '#f97316' },
      { range: '41-60%', min: 41, max: 60, count: 0, color: '#eab308' },
      { range: '61-80%', min: 61, max: 80, count: 0, color: '#84cc16' },
      { range: '81-100%', min: 81, max: 100, count: 0, color: '#22c55e' }
    ];
    
    evaluations.forEach(evaluation => {
      const scorePercent = evaluation.score * 100; // Converter para porcentagem
      const range = scoreRanges.find(r => scorePercent >= r.min && scorePercent <= r.max);
      if (range) range.count++;
    });

    return {
      totalEvaluations,
      uniqueUsers,
      averageScore,
      topPerformers,
      performanceByCategory,
      weeklyTrend,
      distributionData: scoreRanges.filter(r => r.count > 0),
      individualStats: userStats
    };
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

  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

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
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header com filtros redesenhado - Layout ultra compacto */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="py-4">
          {/* Layout em uma única linha com título integrado */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Título com ícone + Períodos Rápidos */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <Label className="text-lg font-semibold text-gray-900 whitespace-nowrap">Filtros de Análise:</Label>
              </div>
              <div className="flex gap-2">
                {PERIOD_OPTIONS.map((option) => (
                  <Button
                    key={option.days}
                    variant={selectedPeriod === option.days ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyPeriod(option.days)}
                    className={`
                      transition-all duration-200 
                      ${selectedPeriod === option.days 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                        : 'hover:bg-blue-50 hover:border-blue-300 text-gray-700'
                      }
                    `}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Botão de Selecionar Período */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                >
                  <CalendarRange className="h-4 w-4" />
                  Selecionar Período
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">Período Personalizado</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="date-from" className="text-xs text-gray-600">Data Inicial</Label>
                      <Input
                        id="date-from"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setSelectedPeriod(-1);
                        }}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date-to" className="text-xs text-gray-600">Data Final</Label>
                      <Input
                        id="date-to"
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setSelectedPeriod(-1);
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Período atual: {dateFrom} até {dateTo}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Separador visual */}
            <div className="h-6 w-px bg-gray-300 mx-2" />

            {/* Filtro de Colaborador */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-gray-700 whitespace-nowrap flex items-center gap-1">
                <Users className="h-4 w-4" />
                Colaborador:
              </Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-44 border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
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

            {/* Separador visual */}
            <div className="h-6 w-px bg-gray-300 mx-2" />

            {/* Ações */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-gray-700 whitespace-nowrap">Ações:</Label>
              <div className="flex gap-2">
                <Button 
                  onClick={exportCSV} 
                  variant="outline" 
                  size="sm" 
                  data-testid="button-export-csv"
                  className="hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                >
                  CSV
                </Button>
                <Button 
                  onClick={simulateSync} 
                  variant="outline" 
                  size="sm" 
                  data-testid="button-sync"
                  className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  Sync
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Avaliações</p>
                <p className="text-3xl font-bold text-blue-900" data-testid="stat-total-evaluations">
                  {stats.totalEvaluations}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Colaboradores</p>
                <p className="text-3xl font-bold text-green-900" data-testid="stat-unique-evaluated">
                  {stats.uniqueUsers}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Score Médio</p>
                <p className="text-3xl font-bold text-orange-900" data-testid="stat-average-score">
                  {Math.round(stats.averageScore)}
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Alertas Ativos</p>
                <p className="text-3xl font-bold text-red-900" data-testid="stat-alerts-count">
                  {alerts.length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Principal */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="individual" data-testid="tab-individual">Individual</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">Relatórios</TabsTrigger>
        </TabsList>

        {/* Aba Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Tendência Semanal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Tendência Semanal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value, name) => [`${value}%`, 'Score Médio']} />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição de Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Distribuição de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.distributionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ range, count }) => `${range}: ${count}`}
                    >
                      {stats.distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance por Categoria */}
          <Card>
            <CardHeader>
              <CardTitle>Performance por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stats.performanceByCategory} margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name) => [`${Number(value).toFixed(1)}%`, 'Performance']}
                    labelFormatter={(label) => {
                      const category = stats.performanceByCategory.find(c => c.name === label);
                      return category?.fullName || label;
                    }}
                  />
                  <Bar dataKey="percentage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topPerformers.map((performer, index) => (
                    <div 
                      key={performer.username}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`top-performer-${performer.username}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{getUserDisplayName(performer.username)}</div>
                          <div className="text-xs text-gray-500">{performer.count} avaliações</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{Math.round(performer.average)}</div>
                        <Progress value={performer.average} className="w-16" />
                      </div>
                    </div>
                  ))}
                  {stats.topPerformers.length === 0 && (
                    <div className="text-center text-gray-500 py-6">Nenhum dado disponível</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alertas Detalhados */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Áreas de Atenção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map(alert => {
                    const question = QUESTIONS.find(q => q.id === alert.questionId);
                    const severity = alert.percentage >= 0.7 ? 'high' : alert.percentage >= 0.5 ? 'medium' : 'low';
                    
                    return (
                      <div
                        key={`${alert.username}-${alert.questionId}`}
                        className={`p-4 rounded-lg border-l-4 ${
                          severity === 'high' ? 'bg-red-50 border-red-500' :
                          severity === 'medium' ? 'bg-orange-50 border-orange-500' :
                          'bg-yellow-50 border-yellow-500'
                        }`}
                        data-testid={`alert-${alert.username}-${alert.questionId}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{getUserDisplayName(alert.username)}</div>
                            <div className="text-sm text-gray-600">{question?.text}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {Math.round(alert.percentage * 100)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {alert.total} avaliações
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {alerts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Award className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>Excelente! Nenhum alerta de performance.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance detalhada por categoria */}
          <Card>
            <CardHeader>
              <CardTitle>Análise Detalhada por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stats.performanceByCategory.map((category, index) => (
                  <div key={category.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{category.fullName}</h4>
                      <Badge variant={category.percentage >= 80 ? "default" : category.percentage >= 60 ? "secondary" : "destructive"}>
                        {category.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <Progress value={category.percentage} className="mb-2" />
                    <div className="text-xs text-gray-600">
                      {category.good} de {category.total} respostas positivas
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Individual */}
        <TabsContent value="individual" className="space-y-6">
          {selectedUser !== "all" ? (
            <Card>
              <CardHeader>
                <CardTitle>Relatório Individual - {getUserDisplayName(selectedUser)}</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.individualStats.has(selectedUser) ? (
                  <div className="space-y-6">
                    {/* Métricas individuais */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-900">
                          {stats.individualStats.get(selectedUser)?.count || 0}
                        </div>
                        <div className="text-sm text-blue-600">Avaliações Recebidas</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-900">
                          {Math.round((stats.individualStats.get(selectedUser)?.scoreSum || 0) / (stats.individualStats.get(selectedUser)?.count || 1))}
                        </div>
                        <div className="text-sm text-green-600">Score Médio</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-900">
                          {stats.topPerformers.findIndex(p => p.username === selectedUser) + 1 || 'N/A'}º
                        </div>
                        <div className="text-sm text-purple-600">Posição no Ranking</div>
                      </div>
                    </div>

                    {/* Performance por categoria individual */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Performance por Categoria</h4>
                      {QUESTIONS.map(question => {
                        const categoryData = stats.individualStats.get(selectedUser)?.categories[question.id];
                        const percentage = categoryData ? (categoryData.good / categoryData.total) * 100 : 0;
                        
                        return (
                          <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{question.text}</div>
                              <div className="text-sm text-gray-600">
                                {categoryData?.good || 0} de {categoryData?.total || 0} respostas positivas
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">{Math.round(percentage)}%</div>
                              <Progress value={percentage} className="w-20" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma avaliação encontrada para este colaborador no período selecionado.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Selecione um colaborador específico para ver o relatório individual detalhado.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba Relatórios */}
        <TabsContent value="reports" className="space-y-6">
          {/* Tabela detalhada com melhor design */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Avaliações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-lg border">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Avaliador</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Avaliado</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Score</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {evaluations.map(evaluation => (
                      <tr key={evaluation.id} className="hover:bg-gray-50" data-testid={`evaluation-row-${evaluation.id}`}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDateTimeBRdash(new Date(evaluation.createdAt))}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {getUserDisplayName(evaluation.evaluator)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {getUserDisplayName(evaluation.evaluated)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={evaluation.score * 100 >= 80 ? "default" : evaluation.score * 100 >= 60 ? "secondary" : "destructive"}>
                            {(evaluation.score * 100).toFixed(0)}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={evaluation.status === "synced" ? "default" : "outline"}>
                            {evaluation.status === "synced" ? "Sincronizado" : "Pendente"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="space-y-1">
                            {evaluation.answers.map(answer => {
                              const question = QUESTIONS.find(q => q.id === answer.questionId);
                              const isGood = answer.value === question?.goodWhenYes;
                              return (
                                <div key={answer.questionId} className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${
                                    isGood ? 'bg-green-500' : 'bg-red-500'
                                  }`}></span>
                                  <span className="text-xs">
                                    {question?.order}. {answer.value ? "SIM" : "NÃO"}
                                    {answer.reason && <span className="text-gray-500"> • {answer.reason}</span>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {evaluations.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Nenhuma avaliação encontrada no período selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}