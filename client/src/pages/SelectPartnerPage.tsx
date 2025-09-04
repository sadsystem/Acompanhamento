import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useStorage } from "../hooks/useStorage";
import { User, TravelRouteWithTeam } from "../config/types";
import { toDateRefBR } from "../utils/time";
import { Users, RefreshCw, ArrowLeft } from "lucide-react";

interface SelectPartnerPageProps {
  currentUser: User;
  onSelected: (username: string) => void;
  accessibilityMode: boolean;
}

export function SelectPartnerPage({ currentUser, onSelected, accessibilityMode }: SelectPartnerPageProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [alreadyEvaluated, setAlreadyEvaluated] = useState<Set<string>>(new Set());
  const [currentRoute, setCurrentRoute] = useState<TravelRouteWithTeam | null>(null);
  const [hasActiveRoute, setHasActiveRoute] = useState<boolean | null>(null);
  const [pendingRoutes, setPendingRoutes] = useState<TravelRouteWithTeam[]>([]);
  const [showingPendingRoute, setShowingPendingRoute] = useState<TravelRouteWithTeam | null>(null);
  
  const storage = useStorage();
  const today = toDateRefBR();

  // Helper function to format all cities in route
  const getAllCitiesFormatted = (route: TravelRouteWithTeam) => {
    const cities = route.cities && route.cities.length > 0 ? route.cities : [route.city || "Equipe Sem Rota"];
    return cities.join(", ");
  };

  // Helper function to format start date from YYYY-MM-DD to DD/MM/YYYY
  const formatStartDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Reset showing pending route when loading new data
    if (hasActiveRoute) {
      setShowingPendingRoute(null);
    }
  }, [hasActiveRoute]);

  useEffect(() => {
    // Reload data when switching between routes
    if (showingPendingRoute) {
      loadData();
    }
  }, [showingPendingRoute]);

  const loadData = async () => {
    try {
      const [allUsers, routes, teams, evaluations] = await Promise.all([
        storage.getUsers(),
        storage.getTravelRoutes(),
        storage.getTeams(),
        storage.getEvaluations({
          evaluator: currentUser.username,
          dateFrom: today,
          dateTo: today
        })
      ]);

      // Find user's current active route
      const activeRoutes = routes.filter(r => r.status === "active");
      let userRoute: TravelRouteWithTeam | null = null;
      let teammates: User[] = [];

      // Check if user is a driver in any active route
      for (const route of activeRoutes) {
        const team = teams.find(t => t.id === route.teamId);
        if (team?.driverUsername === currentUser.username) {
          userRoute = {
            ...route,
            team: {
              ...team,
              driver: allUsers.find(u => u.username === team.driverUsername) || {} as User,
              assistantUsers: team.assistants
                .map(username => allUsers.find(u => u.username === username))
                .filter(u => u !== undefined) as User[]
            }
          };
          teammates = userRoute.team?.assistantUsers || [];
          break;
        }
        
        // Check if user is an assistant in any active route
        if (team?.assistants.includes(currentUser.username)) {
          userRoute = {
            ...route,
            team: {
              ...team,
              driver: allUsers.find(u => u.username === team.driverUsername) || {} as User,
              assistantUsers: team.assistants
                .map(username => allUsers.find(u => u.username === username))
                .filter(u => u !== undefined) as User[]
            }
          };
          // Include driver and other assistants as teammates
          teammates = userRoute.team ? [
            userRoute.team.driver,
            ...userRoute.team.assistantUsers.filter(u => u.username !== currentUser.username)
          ].filter(u => u && u.username) : [];
          break;
        }
      }

      // If no active route, check for completed routes with pending evaluations
      let pendingRoutesFound: TravelRouteWithTeam[] = [];
      if (!userRoute) {
        const completedRoutes = routes.filter(r => r.status === "completed");
        
        for (const route of completedRoutes) {
          // First, get all evaluations for this route to understand the team structure
          const routeEvaluations = await storage.getEvaluations({
            routeId: route.id
          });
          
          // Find evaluations where current user was the evaluator
          const userAsEvaluatorEvals = routeEvaluations.filter(e => e.evaluator === currentUser.username);
          
          // Find evaluations where current user was evaluated (to find teammates)
          const userAsEvaluatedEvals = routeEvaluations.filter(e => e.evaluated === currentUser.username);
          
          // Get all unique usernames involved in this route
          const routeUsernames = new Set([
            ...routeEvaluations.map(e => e.evaluator),
            ...routeEvaluations.map(e => e.evaluated)
          ]);
          
          // Check if user was involved in this route
          const userWasInRoute = routeUsernames.has(currentUser.username);
          
          if (userWasInRoute) {
            // Find potential teammates (all users from route except current user)
            const potentialTeammateUsernames = Array.from(routeUsernames).filter(u => u !== currentUser.username);
            const potentialTeammates = potentialTeammateUsernames
              .map(username => allUsers.find(u => u.username === username))
              .filter(u => u) as User[];
            
            // Check which teammates haven't been evaluated by current user
            const evaluatedUsernames = new Set(userAsEvaluatorEvals.map(e => e.evaluated));
            const pendingTeammates = potentialTeammates.filter(teammate => 
              !evaluatedUsernames.has(teammate.username)
            );

            if (pendingTeammates.length > 0) {
              // Try to find original team from database, fallback to reconstructed team
              let teamData = teams.find(t => t.id === route.teamId);
              
              if (!teamData) {
                // Reconstruct team from evaluations
                // Try to identify who was the driver (user who evaluated others but wasn't evaluated much)
                const evaluatorCounts = new Map();
                const evaluatedCounts = new Map();
                
                routeEvaluations.forEach(evaluation => {
                  evaluatorCounts.set(evaluation.evaluator, (evaluatorCounts.get(evaluation.evaluator) || 0) + 1);
                  evaluatedCounts.set(evaluation.evaluated, (evaluatedCounts.get(evaluation.evaluated) || 0) + 1);
                });
                
                // Usually driver evaluates assistants but is rarely evaluated
                const likelyDriver = Array.from(routeUsernames).find(username => {
                  const evaluatorCount = evaluatorCounts.get(username) || 0;
                  const evaluatedCount = evaluatedCounts.get(username) || 0;
                  return evaluatorCount > evaluatedCount;
                }) || Array.from(routeUsernames)[0]; // Fallback to first user
                
                const assistants = Array.from(routeUsernames).filter(u => u !== likelyDriver);
                
                teamData = {
                  id: route.id + "-reconstructed",
                  driverUsername: likelyDriver,
                  assistants: assistants,
                  createdAt: route.createdAt,
                  updatedAt: route.updatedAt || route.createdAt
                };
              }

              pendingRoutesFound.push({
                ...route,
                team: {
                  ...teamData,
                  driver: allUsers.find(u => u.username === teamData.driverUsername) || {} as User,
                  assistantUsers: teamData.assistants
                    .map(username => allUsers.find(u => u.username === username))
                    .filter(u => u !== undefined) as User[]
                }
              });
            }
          }
        }
      }

      setCurrentRoute(userRoute);
      setHasActiveRoute(userRoute !== null);
      setPendingRoutes(pendingRoutesFound);
      
      // If showing a pending route, use it for teammates
      if (showingPendingRoute && pendingRoutesFound.find(r => r.id === showingPendingRoute.id)) {
        const pendingRoute = pendingRoutesFound.find(r => r.id === showingPendingRoute.id)!;
        
        // Get evaluations for this route to find remaining teammates to evaluate
        const routeEvaluations = await storage.getEvaluations({
          evaluator: currentUser.username,
          routeId: pendingRoute.id
        });
        
        const evaluatedUsernames = new Set(routeEvaluations.map(e => e.evaluated));
        
        // Find all users who were in the route but haven't been evaluated yet
        const allRouteEvaluations = await storage.getEvaluations({ routeId: pendingRoute.id });
        const allRouteUsernames = new Set([
          ...allRouteEvaluations.map(e => e.evaluator),
          ...allRouteEvaluations.map(e => e.evaluated)
        ]);
        
        teammates = Array.from(allRouteUsernames)
          .filter(username => username !== currentUser.username && !evaluatedUsernames.has(username))
          .map(username => allUsers.find(u => u.username === username))
          .filter(u => u && u.active && u.role === "colaborador") as User[];
        
        // Update current route display for pending route
        setCurrentRoute(pendingRoute);
      }
      
      // Filter users to only show teammates from active or selected pending route
      const partners = teammates.filter(
        u => u.active && 
             u.role === "colaborador" && 
             u.username !== currentUser.username
      );
      
      setUsers(partners);
      
      // Check evaluations by routeId directly
      const currentRouteForEval = showingPendingRoute || userRoute;
      if (currentRouteForEval) {
        const routeEvaluations = await storage.getEvaluations({
          evaluator: currentUser.username,
          routeId: currentRouteForEval.id
        });
        
        setAlreadyEvaluated(new Set(routeEvaluations.map(e => e.evaluated)));
      } else {
        setAlreadyEvaluated(new Set());
      }
    } catch (error) {
      console.error("Error loading partner data:", error);
      setHasActiveRoute(false);
      setUsers([]);
      setPendingRoutes([]);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.displayName + " " + u.username).toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectPendingRoute = (route: TravelRouteWithTeam) => {
    setShowingPendingRoute(route);
  };

  const handleBackToActiveRoute = () => {
    setShowingPendingRoute(null);
    loadData();
  };

  return (
    <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto p-4">
      <Card className={accessibilityMode ? 'accessibility-mode' : ''}>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 text-center uppercase tracking-wide">
            SELECIONE O PARCEIRO DE EQUIPE
          </h2>
          
          {/* Acompanhamentos Pendentes */}
          {!hasActiveRoute && pendingRoutes.length > 0 && !showingPendingRoute && (
            <Alert className="mb-4 bg-orange-50 border-orange-200">
              <AlertDescription>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <strong className="text-orange-800">⚠️ Acompanhamentos Pendentes</strong><br />
                    <span className="text-orange-700">
                      Você possui {pendingRoutes.length} rota(s) finalizada(s) com avaliações pendentes.
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {pendingRoutes.map(route => (
                    <div key={route.id} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="text-sm">
                        <strong>{getAllCitiesFormatted(route)}</strong><br />
                        <span className="text-gray-600">Finalizada em: {formatStartDate(route.endDate || route.startDate)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectPendingRoute(route)}
                        className="text-orange-700 border-orange-300 hover:bg-orange-50"
                      >
                        Avaliar Pendentes
                      </Button>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Volta para rota ativa */}
          {showingPendingRoute && hasActiveRoute && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <AlertDescription>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <strong className="text-blue-800">📋 Avaliando Rota Finalizada</strong><br />
                    <span className="text-blue-700">
                      Você está avaliando uma rota finalizada. Volte para a rota ativa quando terminar.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackToActiveRoute}
                    className="text-blue-700 border-blue-300 hover:bg-blue-50"
                  >
                    Voltar à Rota Ativa
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          
          {hasActiveRoute === false && pendingRoutes.length === 0 && (
            <Alert className="mb-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5" />
                  <AlertDescription>
                    <strong>Aguardando definição de rota...</strong><br />
                    Verifique novamente mais tarde.
                  </AlertDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  className="ml-4 flex items-center gap-1"
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-3 w-3" />
                  Atualizar
                </Button>
              </div>
            </Alert>
          )}
          
          {currentRoute && (
            <Alert className="mb-4">
              <AlertDescription>
                <strong>Rota {showingPendingRoute ? 'Finalizada' : 'Ativa'}:</strong> {getAllCitiesFormatted(currentRoute)}<br />
                <strong>Data de início:</strong> {formatStartDate(currentRoute.startDate)}<br />
                {currentRoute.endDate && showingPendingRoute && (
                  <><strong>Data de finalização:</strong> {formatStartDate(currentRoute.endDate)}<br /></>
                )}
                {currentRoute.vehicle && (
                  <><strong>Veículo:</strong> {currentRoute.vehicle.plate} {currentRoute.vehicle.model && currentRoute.vehicle.year ? `(${currentRoute.vehicle.model} ${currentRoute.vehicle.year})` : currentRoute.vehicle.model || ''}<br /></>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 gap-2">
            {filteredUsers.map(user => (
              <div
                key={user.username}
                className={`flex items-center justify-between border rounded-2xl px-3 py-2 ${
                  !alreadyEvaluated.has(user.username) ? 'cursor-pointer hover:bg-gray-50' : ''
                }`}
                onClick={!alreadyEvaluated.has(user.username) ? () => onSelected(user.username) : undefined}
                data-testid={`partner-${user.username}`}
              >
                <div className="text-sm">
                  <div className="font-medium" data-testid={`name-${user.username}`}>
                    {user.displayName}
                  </div>
                  <div className="text-gray-600" data-testid={`role-${user.username}`}>
                    {user.cargo || "Colaborador"}
                  </div>
                </div>
                
                <Button
                  variant={alreadyEvaluated.has(user.username) ? "secondary" : "default"}
                  disabled={alreadyEvaluated.has(user.username)}
                  onClick={() => onSelected(user.username)}
                  data-testid={`button-select-${user.username}`}
                >
                  {alreadyEvaluated.has(user.username) ? "Finalizado" : "Acompanhar"}
                </Button>
              </div>
            ))}
            
            {(hasActiveRoute === true || showingPendingRoute) && filteredUsers.length === 0 && (
              <div className="text-sm text-gray-600 text-center py-4" data-testid="no-partners">
                {showingPendingRoute 
                  ? "Todas as avaliações desta rota foram concluídas." 
                  : "Nenhum colega de equipe encontrado para avaliar."
                }
              </div>
            )}
            
            {hasActiveRoute === false && pendingRoutes.length === 0 && (
              <div className="text-sm text-gray-600 text-center py-8" data-testid="no-partners">
                Aguarde ser designado para uma rota para poder realizar o acompanhamento dos colegas de equipe.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
