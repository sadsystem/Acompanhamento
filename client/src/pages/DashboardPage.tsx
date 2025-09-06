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
import { TrendingUp, TrendingDown, Users, Calendar, AlertTriangle, Award, Target, Activity, CalendarDays, CalendarRange, BarChart3, Download, FileText, FileSpreadsheet, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { useStorage } from "../hooks/useStorage";
import { User, Evaluation } from "../config/types";
import { QUESTIONS } from "../config/questions";
import { CONFIG } from "../config/constants";
import { toDateRefBR, formatDateTimeBRdash, getDefaultDashboardPeriod, getDateRangeBR, formatDateBR } from "../utils/time";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

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
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  
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

  // Função helper para formatação inteligente de porcentagens
  const formatPercentage = (value: number): string => {
    const rounded = Math.round(value);
    const hasDecimal = Math.abs(value - rounded) > 0.05;
    return hasDecimal ? `${value.toFixed(1)}%` : `${rounded}%`;
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

    // Trend baseado no período real (datas selecionadas)
    const weeklyTrend = [];
    
    // Calcular período real baseado nas datas selecionadas
    const startDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : new Date();
    const endDate = dateTo ? new Date(dateTo + 'T00:00:00') : new Date();
    
    // Se não há datas definidas, usar período padrão
    if (!dateFrom || !dateTo) {
      const today = new Date();
      const daysToShow = selectedPeriod === 0 ? 1 : selectedPeriod;
      
      for (let i = daysToShow - 1; i >= 0; i--) {
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
    } else {
      // Usar período baseado nas datas selecionadas
      const currentDate = new Date(startDate);
      const tempTrend = [];
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const dayEvaluations = evaluations.filter(e => e.dateRef === dateStr);
        const avgScore = dayEvaluations.length > 0 
          ? (dayEvaluations.reduce((sum, e) => sum + e.score, 0) / dayEvaluations.length) * 100
          : 0;
        
        tempTrend.push({
          date: currentDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
          score: Number(avgScore.toFixed(2)),
          count: dayEvaluations.length,
          fullDate: new Date(currentDate)
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Se período muito longo (>45 dias), agregar por semana para melhor visualização
      if (tempTrend.length > 45) {
        const weeklyData = [];
        for (let i = 0; i < tempTrend.length; i += 7) {
          const weekData = tempTrend.slice(i, i + 7);
          const daysWithData = weekData.filter(d => d.count > 0);
          const avgWeekScore = daysWithData.length > 0 
            ? daysWithData.reduce((sum, d) => sum + d.score, 0) / daysWithData.length
            : 0;
          
          const startOfWeek = weekData[0].fullDate;
          weeklyData.push({
            date: startOfWeek.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            score: Number(avgWeekScore.toFixed(2)),
            count: weekData.reduce((sum, d) => sum + d.count, 0)
          });
        }
        weeklyTrend.push(...weeklyData);
      } else {
        // Usar dados diários para períodos menores
        weeklyTrend.push(...tempTrend.map(({ fullDate, ...rest }) => rest));
      }
    }

    // Distribuição de scores
    const scoreRanges = [
      { range: '0-20%', min: 0, max: 20, count: 0, color: '#dc2626' },
      { range: '21-40%', min: 21, max: 40, count: 0, color: '#ea580c' },
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
      distributionData: scoreRanges, // Retorna todos os ranges, mesmo com count 0
      individualStats: userStats
    };
  }, [evaluations, selectedPeriod, dateFrom, dateTo]);

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

  const exportToXLSX = () => {
    try {
      const headers = [
        "ID", "Data Criação", "Data Referência", "Avaliador", "Avaliado", "Score (%)",
        ...QUESTIONS.flatMap(q => [`${q.text} - Resposta`, `${q.text} - Justificativa`])
      ];
      
      const rows = evaluations.map(evaluation => {
        const row: any[] = [
          evaluation.id,
          formatDateTimeBRdash(new Date(evaluation.createdAt)),
          evaluation.dateRef,
          getUserDisplayName(evaluation.evaluator),
          getUserDisplayName(evaluation.evaluated),
          formatPercentage((evaluation.score || 0) * 100)
        ];
        
        QUESTIONS.forEach(question => {
          const answer = evaluation.answers.find(a => a.questionId === question.id);
          row.push(answer ? (answer.value ? "SIM" : "NÃO") : "");
          row.push(answer?.reason || "");
        });
        
        return row;
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      
      // Configurar largura das colunas
      const colWidths = [
        { wch: 36 }, // ID
        { wch: 18 }, // Data Criação
        { wch: 15 }, // Data Referência
        { wch: 20 }, // Avaliador
        { wch: 20 }, // Avaliado
        { wch: 10 }, // Score
        ...QUESTIONS.flatMap(() => [{ wch: 15 }, { wch: 30 }]) // Respostas e justificativas
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, "Avaliações");
      
      const fileName = `avaliacoes_${dateFrom.replace(/-/g, '')}_${dateTo.replace(/-/g, '')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      setExportDialogOpen(false);
    } catch (error) {
      console.error('Erro ao exportar XLSX:', error);
      alert('Erro ao exportar planilha. Verifique o console para mais detalhes.');
    }
  };

  const exportToPDF = async () => {
    try {
      setExportDialogOpen(false); // Fechar o dialog primeiro para não aparecer na captura
      
      // Aguardar um pouco para o dialog fechar
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Título do relatório
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Performance - Dashboard', margin, 20);
      
      // Período
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${formatDateBR(dateFrom)} até ${formatDateBR(dateTo)}`, margin, 30);
      
      if (selectedUser !== "all") {
        doc.text(`Colaborador: ${getUserDisplayName(selectedUser)}`, margin, 38);
      }
      
      let yPosition = 50;
      
      // Função para capturar e adicionar elemento ao PDF
      const captureAndAddElement = async (elementId: string, title: string) => {
        const element = document.getElementById(elementId);
        if (!element) {
          console.warn(`Elemento ${elementId} não encontrado`);
          return yPosition;
        }
        
        try {
          // Capturar o elemento como imagem
          const canvas = await html2canvas(element, {
            scale: 2, // Maior qualidade
            backgroundColor: '#ffffff',
            logging: false,
            allowTaint: true,
            useCORS: true,
            width: element.offsetWidth,
            height: element.offsetHeight
          });
          
          // Converter para base64
          const imgData = canvas.toDataURL('image/png');
          
          // Calcular dimensões para o PDF
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Verificar se precisa de nova página
          if (yPosition + imgHeight + 20 > pageHeight - margin) {
            doc.addPage();
            yPosition = margin + 10;
          }
          
          // Adicionar título da seção
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(title, margin, yPosition);
          yPosition += 10;
          
          // Adicionar a imagem
          doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 15;
          
          return yPosition;
        } catch (error) {
          console.error(`Erro ao capturar ${elementId}:`, error);
          return yPosition;
        }
      };
      
      // Capturar cada bloco do dashboard
      yPosition = await captureAndAddElement('tendencia-diaria-block', 'Tendência Diária');
      yPosition = await captureAndAddElement('distribuicao-performance-block', 'Distribuição de Performance');
      yPosition = await captureAndAddElement('performance-categoria-block', 'Performance por Categoria');
      
      // Salvar o PDF
      const fileName = `relatorio_dashboard_${dateFrom.replace(/-/g, '')}_${dateTo.replace(/-/g, '')}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF. Verifique o console para mais detalhes.');
      setExportDialogOpen(false);
    }
  };

  const getUserDisplayName = (username: string) => {
    return users.find(u => u.username === username)?.displayName || username;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header com filtros redesenhado */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="py-4">
          {/* Título centralizado */}
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <Label className="text-lg font-semibold text-gray-900">Filtros de Análise</Label>
            </div>
          </div>

          {/* Conteúdo dos filtros */}
          <div className="flex flex-wrap items-center gap-4 justify-center">
            {/* Períodos Rápidos */}
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
              <PopoverContent className="w-80 p-4" align="center">
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
                    Período atual: {formatDateBR(dateFrom)} até {formatDateBR(dateTo)}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Separador visual */}
            <div className="h-6 w-px bg-gray-300 mx-2" />

            {/* Filtro de Colaborador com busca */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-gray-700 whitespace-nowrap flex items-center gap-1">
                <Users className="h-4 w-4" />
                Colaborador:
              </Label>
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userSearchOpen}
                    className="w-48 justify-between hover:bg-blue-50 hover:border-blue-300"
                  >
                    {selectedUser === "all" 
                      ? "Todos" 
                      : getUserDisplayName(selectedUser)
                    }
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar colaborador..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          key="all"
                          value="all"
                          onSelect={() => {
                            setSelectedUser("all");
                            setUserSearchOpen(false);
                          }}
                        >
                          Todos
                        </CommandItem>
                        {users
                          .filter(u => u.role === "colaborador")
                          .map(user => (
                            <CommandItem
                              key={user.username}
                              value={user.displayName}
                              onSelect={() => {
                                setSelectedUser(user.username);
                                setUserSearchOpen(false);
                              }}
                            >
                              {user.displayName}
                            </CommandItem>
                          ))
                        }
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Separador visual */}
            <div className="h-6 w-px bg-gray-300 mx-2" />

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="hover:bg-green-50 hover:border-green-300 hover:text-green-700 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Exportar Relatório
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="text-sm text-gray-600 mb-4">
                      Selecione o formato de exportação para o período de {formatDateBR(dateFrom)} até {formatDateBR(dateTo)}
                      {selectedUser !== "all" && ` - Colaborador: ${getUserDisplayName(selectedUser)}`}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={exportToXLSX}
                        variant="outline"
                        className="h-20 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-300"
                      >
                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                        <div className="text-center">
                          <div className="font-medium">XLSX</div>
                          <div className="text-xs text-gray-500">Planilha de dados</div>
                        </div>
                      </Button>
                      <Button 
                        onClick={exportToPDF}
                        variant="outline"
                        className="h-20 flex flex-col items-center gap-2 hover:bg-red-50 hover:border-red-300"
                      >
                        <FileText className="h-8 w-8 text-red-600" />
                        <div className="text-center">
                          <div className="font-medium">PDF</div>
                          <div className="text-xs text-gray-500">Relatório gráfico</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                onClick={simulateSync} 
                variant="outline" 
                size="sm" 
                className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 flex items-center gap-2"
              >
                <Activity className="h-4 w-4" />
                Sync
              </Button>
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
            {/* Tendência Diária - Design Renovado */}
            <Card className="border-0 shadow-lg" id="tendencia-diaria-block">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Tendência Diária
                </CardTitle>
                <p className="text-sm text-gray-600">Evolução da performance média diária no período selecionado</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Gráfico principal */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.weeklyTrend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false}
                        tickLine={false}
                        fontSize={12}
                        tick={{ fill: '#6b7280' }}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        axisLine={false}
                        tickLine={false}
                        fontSize={12}
                        tick={{ fill: '#6b7280' }}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`${value}%`, 'Performance']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 6, fill: '#16a34a' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Métricas de resumo em 3 cards lado a lado */}
                <div className="grid grid-cols-3 gap-4 pt-4">
                  {/* Card Maior Score - Azul */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const daysWithData = stats.weeklyTrend.filter(d => d.score > 0);
                        const maxScore = daysWithData.length > 0 ? Math.max(...daysWithData.map(d => d.score)) : 0;
                        return maxScore > 0 ? formatPercentage(maxScore) : '0%';
                      })()}
                    </div>
                    <div className="text-sm text-blue-600 font-medium">Maior Score</div>
                  </div>

                  {/* Card Média - Verde */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(() => {
                        const daysWithData = stats.weeklyTrend.filter(d => d.score > 0);
                        const avgScore = daysWithData.length > 0 ? 
                          (daysWithData.reduce((sum, d) => sum + d.score, 0) / daysWithData.length) : 0;
                        return avgScore > 0 ? formatPercentage(avgScore) : '0%';
                      })()}
                    </div>
                    <div className="text-sm text-green-600 font-medium">Média</div>
                  </div>

                  {/* Card Menor Score - Laranja */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {(() => {
                        const daysWithData = stats.weeklyTrend.filter(d => d.score > 0);
                        const minScore = daysWithData.length > 0 ? Math.min(...daysWithData.map(d => d.score)) : 0;
                        return minScore > 0 ? formatPercentage(minScore) : '0%';
                      })()}
                    </div>
                    <div className="text-sm text-orange-600 font-medium">Menor Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Distribuição de Performance - Design Compacto */}
            <Card className="border-0 shadow-lg" id="distribuicao-performance-block">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Award className="h-5 w-5 text-blue-600" />
                  Distribuição de Performance
                </CardTitle>
                <p className="text-sm text-gray-600">Classificação das avaliações por faixas de pontuação no período selecionado</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Layout principal: Gráfico à esquerda, métricas à direita */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Gráfico em formato donut - LADO ESQUERDO */}
                  <div className="flex justify-center items-center relative">
                    {/* Sombra/Gradiente de fundo para o gráfico */}
                    <div className="absolute inset-0 flex justify-center items-center">
                      <div className="w-52 h-52 rounded-full bg-gradient-to-br from-gray-100 via-gray-50 to-white shadow-2xl"></div>
                    </div>
                    
                    {/* Container do gráfico com posicionamento relativo */}
                    <div className="relative z-10">
                      <ResponsiveContainer width={220} height={220}>
                        <PieChart>
                          <defs>
                            {/* Gradientes para cada cor */}
                            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#fca5a5" />
                              <stop offset="100%" stopColor="#dc2626" />
                            </linearGradient>
                            <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#fdba74" />
                              <stop offset="100%" stopColor="#ea580c" />
                            </linearGradient>
                            <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#fde047" />
                              <stop offset="100%" stopColor="#eab308" />
                            </linearGradient>
                            <linearGradient id="lightGreenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#bef264" />
                              <stop offset="100%" stopColor="#84cc16" />
                            </linearGradient>
                            <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#86efac" />
                              <stop offset="100%" stopColor="#22c55e" />
                            </linearGradient>
                          </defs>
                          <Pie
                            data={stats.distributionData.filter(d => d.count > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="count"
                            stroke="rgba(255,255,255,0.8)"
                            strokeWidth={2}
                          >
                            {stats.distributionData.filter(d => d.count > 0).map((entry, index) => {
                              // Mapear cores para gradientes
                              const gradientMap: Record<string, string> = {
                                '#dc2626': 'url(#redGradient)',
                                '#ea580c': 'url(#orangeGradient)', 
                                '#eab308': 'url(#yellowGradient)',
                                '#84cc16': 'url(#lightGreenGradient)',
                                '#22c55e': 'url(#greenGradient)'
                              };
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={gradientMap[entry.color] || entry.color}
                                  style={{
                                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                                    transition: 'all 0.3s ease'
                                  }}
                                />
                              );
                            })}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name, props) => [
                              `${value} avaliação${value !== 1 ? 'ões' : ''}`, 
                              props.payload.range
                            ]}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '12px',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                              fontSize: '14px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Texto central com a média */}
                      <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                        <div className={`text-3xl font-bold ${
                          stats.averageScore >= 80 ? 'text-green-600' :
                          stats.averageScore >= 60 ? 'text-blue-600' :
                          stats.averageScore >= 40 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {formatPercentage(stats.averageScore)}
                        </div>
                        <div className="text-sm font-medium text-gray-600 mt-1">Média</div>
                      </div>
                    </div>
                  </div>

                  {/* Métricas e Cards - LADO DIREITO */}
                  <div className="space-y-4">
                    {/* Cards das categorias - Design compacto em uma linha */}
                    <div className="space-y-2">
                      {[
                        { range: '0-20%', label: 'Crítico', color: '#dc2626' },
                        { range: '21-40%', label: 'Ruim', color: '#ea580c' },
                        { range: '41-60%', label: 'Regular', color: '#eab308' },
                        { range: '61-80%', label: 'Bom', color: '#84cc16' },
                        { range: '81-100%', label: 'Excelente', color: '#22c55e' }
                      ].map(item => {
                        const data = stats.distributionData.find(d => d.range === item.range);
                        const count = data?.count || 0;
                        const percentage = stats.totalEvaluations > 0 ? (count / stats.totalEvaluations * 100).toFixed(1) : '0.0';
                        const hasData = count > 0;
                        
                        return (
                          <div 
                            key={item.range} 
                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200 ${
                              hasData 
                                ? 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm' 
                                : 'bg-gray-50/50 border-gray-100 opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div 
                                className={`w-3 h-3 rounded-full flex-shrink-0 ${hasData ? 'shadow-sm' : ''}`}
                                style={{ backgroundColor: item.color }}
                              ></div>
                              <span className={`text-sm font-medium ${hasData ? 'text-gray-900' : 'text-gray-500'}`}>
                                {item.range} {item.label}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                hasData 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                  : 'bg-gray-100 text-gray-400 border border-gray-200'
                              }`}>
                                {count}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Métricas finais - nova seção na parte inferior */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="text-center bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-2xl font-bold text-blue-700">{stats.totalEvaluations}</div>
                    <div className="text-xs text-blue-600 font-medium">Total de Avaliações</div>
                  </div>
                  <div className="text-center bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="text-2xl font-bold text-green-700">
                      {(() => {
                        const positive = (stats.distributionData.find(d => d.range === '81-100%')?.count || 0) + 
                                       (stats.distributionData.find(d => d.range === '61-80%')?.count || 0);
                        const positivePercentage = stats.totalEvaluations > 0 ? (positive / stats.totalEvaluations * 100) : 0;
                        return formatPercentage(positivePercentage);
                      })()}
                    </div>
                    <div className="text-xs text-green-600 font-medium">Avaliações Positivas</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance por Categoria - Design Renovado */}
          <Card className="border-0 shadow-lg" id="performance-categoria-block">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Performance por Categoria
              </CardTitle>
              <p className="text-sm text-gray-600">Análise detalhada da performance em cada categoria de avaliação</p>
            </CardHeader>
            <CardContent>
              {/* Grid 2x2 para layout compacto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.performanceByCategory.map((category, index) => {
                  const isGoodCategory = category.percentage >= 75;
                  const isAverageCategory = category.percentage >= 50 && category.percentage < 75;
                  const isCriticalCategory = category.percentage < 50;
                  
                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200">
                      {/* Header compacto da categoria */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 pr-2">
                          <h3 className="font-semibold text-gray-900 leading-tight text-sm">
                            {category.fullName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {category.good} de {category.total} positivas
                            </span>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              isGoodCategory ? 'bg-green-500' :
                              isAverageCategory ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}></div>
                          </div>
                        </div>
                        
                        {/* Score visual compacto */}
                        <div className={`text-right px-2 py-1 rounded-md text-xs border ${
                          isGoodCategory ? 'bg-green-50 border-green-200 text-green-700' :
                          isAverageCategory ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                          'bg-red-50 border-red-200 text-red-700'
                        }`}>
                          <div className="text-lg font-bold leading-tight">
                            {formatPercentage(category.percentage)}
                          </div>
                          <div className="text-xs font-medium">
                            {isGoodCategory ? 'Excelente' :
                             isAverageCategory ? 'Regular' :
                             'Crítico'}
                          </div>
                        </div>
                      </div>

                      {/* Barra de progresso compacta */}
                      <div className="space-y-1">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isGoodCategory ? 'bg-gradient-to-r from-green-400 to-green-600' :
                              isAverageCategory ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                              'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${Math.max(category.percentage, 3)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Detalhes simplificados */}
                      {category.total > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-sm font-semibold text-green-600">
                                {category.good}
                              </div>
                              <div className="text-xs text-gray-500">
                                {category.good === 1 ? 'Excelente' : 'Excelentes'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-red-600">
                                {category.total - category.good}
                              </div>
                              <div className="text-xs text-gray-500">
                                {(category.total - category.good) === 1 ? 'Problema' : 'Problemas'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-blue-600">
                                {category.total}
                              </div>
                              <div className="text-xs text-gray-500">Total</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
                              {formatPercentage(alert.percentage * 100)}
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
                              <div className="text-lg font-bold">{formatPercentage(percentage)}</div>
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