import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useStorage } from "../hooks/useStorage";
import { User, TravelRouteWithTeam } from "../config/types";
import { toDateRefBR } from "../utils/time";
import { Users, RefreshCw, Eye } from "lucide-react";

interface SelectPartnerPageProps {
  currentUser: User;
  onSelected: (username: string) => void;
}

export function SelectPartnerPage({ currentUser, onSelected }: SelectPartnerPageProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [alreadyEvaluated, setAlreadyEvaluated] = useState<Set<string>>(new Set());
  const [currentRoute, setCurrentRoute] = useState<TravelRouteWithTeam | null>(null);
  const [hasActiveRoute, setHasActiveRoute] = useState<boolean | null>(null);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  
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

      setCurrentRoute(userRoute);
      setHasActiveRoute(userRoute !== null);
      
      // Filter users to only show teammates from same active route
      const partners = teammates.filter(
        u => u.active && 
             u.role === "colaborador" && 
             u.username !== currentUser.username
      );
      
      setUsers(partners);
      setAlreadyEvaluated(new Set(evaluations.map(e => e.evaluated)));
    } catch (error) {
      console.error("Error loading partner data:", error);
      setHasActiveRoute(false);
      setUsers([]);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.displayName + " " + u.username).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col justify-center max-w-3xl mx-auto p-4">
      <Card className={accessibilityMode ? 'accessibility-mode' : ''}>
        <CardContent className="pt-6">
          <div className="mb-4">
            {/* Layout para telas grandes */}
            <div className="hidden sm:flex justify-center items-center relative">
              <button
                onClick={() => setAccessibilityMode(!accessibilityMode)}
                className={`absolute left-0 px-3 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50 transition-colors ${
                  accessibilityMode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'text-gray-600'
                }`}
                data-testid="button-accessibility"
                title="Modo de Acessibilidade"
              >
                <Eye className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-semibold uppercase tracking-wide">
                SELECIONE O PARCEIRO DE EQUIPE
              </h2>
            </div>
            
            {/* Layout para telas pequenas */}
            <div className="sm:hidden">
              <div className="flex justify-start mb-2">
                <button
                  onClick={() => setAccessibilityMode(!accessibilityMode)}
                  className={`px-3 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50 transition-colors ${
                    accessibilityMode ? 'bg-blue-50 border-blue-200 text-blue-700' : 'text-gray-600'
                  }`}
                  data-testid="button-accessibility-mobile"
                  title="Modo de Acessibilidade"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-lg font-semibold uppercase tracking-wide text-center">
                SELECIONE O PARCEIRO DE EQUIPE
              </h2>
            </div>
          </div>
          
          
          {hasActiveRoute === false && (
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
              <Users className="h-4 w-4" />
              <AlertDescription>
                <strong>Rota Ativa:</strong> {getAllCitiesFormatted(currentRoute)}<br />
                <strong>Data de início:</strong> {formatStartDate(currentRoute.startDate)}<br />
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
            
            {hasActiveRoute === true && filteredUsers.length === 0 && (
              <div className="text-sm text-gray-600 text-center py-4" data-testid="no-partners">
                Nenhum colega de equipe encontrado para avaliar.
              </div>
            )}
            
            {hasActiveRoute === false && (
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
