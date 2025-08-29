import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useStorage } from "../hooks/useStorage";
import { User, Team, TeamWithMembers, TravelRoute, TravelRouteWithTeam } from "../config/types";
import { toDateRefBR } from "../utils/time";
import { uuid } from "../utils/calc";

export function TeamBuilderPage() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [assistants, setAssistants] = useState<User[]>([]);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [routes, setRoutes] = useState<TravelRouteWithTeam[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<User[]>([]);
  const [availableAssistants, setAvailableAssistants] = useState<User[]>([]);
  
  // Form states for new route
  const [newRouteCity, setNewRouteCity] = useState("");
  const [newRouteDate, setNewRouteDate] = useState(toDateRefBR());
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const storage = useStorage();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const users = await storage.getUsers();
      const driversData = users.filter(u => u.active && u.cargo === "Motorista");
      const assistantsData = users.filter(u => u.active && u.cargo === "Ajudante");
      
      setDrivers(driversData);
      setAssistants(assistantsData);

      // Load teams and routes from storage
      const [teamsData, routesData] = await Promise.all([
        storage.getTeams(),
        storage.getTravelRoutes()
      ]);

      // Convert teams to TeamWithMembers
      const teamsWithMembers: TeamWithMembers[] = teamsData.map(team => {
        const driver = users.find(u => u.username === team.driverUsername);
        const assistantUsers = team.assistants
          .map(username => users.find(u => u.username === username))
          .filter(u => u !== undefined) as User[];

        return {
          ...team,
          driver: driver || {} as User,
          assistantUsers
        };
      });

      // Convert routes to TravelRouteWithTeam
      const routesWithTeam: TravelRouteWithTeam[] = routesData.map(route => {
        const team = teamsWithMembers.find(t => t.id === route.teamId);
        return {
          ...route,
          team
        };
      });

      setTeams(teamsWithMembers);
      setRoutes(routesWithTeam);
      
      updateAvailableUsers(driversData, assistantsData, teamsWithMembers, routesWithTeam);
    } catch (error) {
      console.error("Error loading team builder data:", error);
    }
  };

  const updateAvailableUsers = (
    allDrivers: User[], 
    allAssistants: User[], 
    currentTeams: TeamWithMembers[], 
    activeRoutes: TravelRouteWithTeam[]
  ) => {
    // Get users already assigned to teams or active routes
    const assignedDrivers = new Set<string>();
    const assignedAssistants = new Set<string>();

    currentTeams.forEach(team => {
      assignedDrivers.add(team.driverUsername);
      team.assistants.forEach(assistantUsername => {
        assignedAssistants.add(assistantUsername);
      });
    });

    activeRoutes.forEach(route => {
      if (route.team && route.status === "active") {
        assignedDrivers.add(route.team.driverUsername);
        route.team.assistants.forEach(assistantUsername => {
          assignedAssistants.add(assistantUsername);
        });
      }
    });

    setAvailableDrivers(allDrivers.filter(d => !assignedDrivers.has(d.username)));
    setAvailableAssistants(allAssistants.filter(a => !assignedAssistants.has(a.username)));
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    if (sourceId === destId && source.index === destination.index) return;

    // Handle dragging from available users to teams
    if (sourceId === "available-drivers" && destId.startsWith("team-")) {
      const teamIndex = parseInt(destId.split("-")[1]);
      const draggedDriver = availableDrivers.find(d => d.id === draggableId);
      
      if (draggedDriver && teams[teamIndex]) {
        const updatedTeams = [...teams];
        // Remove current driver from team if exists
        if (updatedTeams[teamIndex].driver) {
          setAvailableDrivers(prev => [...prev, updatedTeams[teamIndex].driver]);
        }
        
        updatedTeams[teamIndex] = {
          ...updatedTeams[teamIndex],
          driverUsername: draggedDriver.username,
          driver: draggedDriver
        };
        
        setTeams(updatedTeams);
        setAvailableDrivers(prev => prev.filter(d => d.id !== draggableId));
        saveTeam(updatedTeams[teamIndex]);
      }
    }

    if (sourceId === "available-assistants" && destId.startsWith("team-")) {
      const teamIndex = parseInt(destId.split("-")[1]);
      const draggedAssistant = availableAssistants.find(a => a.id === draggableId);
      
      if (draggedAssistant && teams[teamIndex] && teams[teamIndex].assistants.length < 2) {
        const updatedTeams = [...teams];
        updatedTeams[teamIndex] = {
          ...updatedTeams[teamIndex],
          assistants: [...updatedTeams[teamIndex].assistants, draggedAssistant.username],
          assistantUsers: [...updatedTeams[teamIndex].assistantUsers, draggedAssistant]
        };
        
        setTeams(updatedTeams);
        setAvailableAssistants(prev => prev.filter(a => a.id !== draggableId));
        saveTeam(updatedTeams[teamIndex]);
      }
    }

    // Handle removing users from teams back to available
    if (sourceId.startsWith("team-") && destId === "available-drivers") {
      const teamIndex = parseInt(sourceId.split("-")[1]);
      const team = teams[teamIndex];
      
      if (team.driver && team.driver.id === draggableId) {
        const updatedTeams = [...teams];
        updatedTeams[teamIndex] = {
          ...updatedTeams[teamIndex],
          driverUsername: "",
          driver: {} as User
        };
        
        setTeams(updatedTeams);
        setAvailableDrivers(prev => [...prev, team.driver]);
        saveTeam(updatedTeams[teamIndex]);
      }
    }

    if (sourceId.startsWith("team-") && destId === "available-assistants") {
      const teamIndex = parseInt(sourceId.split("-")[1]);
      const team = teams[teamIndex];
      const draggedAssistant = team.assistantUsers.find(a => a.id === draggableId);
      
      if (draggedAssistant) {
        const updatedTeams = [...teams];
        updatedTeams[teamIndex] = {
          ...updatedTeams[teamIndex],
          assistants: updatedTeams[teamIndex].assistants.filter(username => username !== draggedAssistant.username),
          assistantUsers: updatedTeams[teamIndex].assistantUsers.filter(a => a.id !== draggableId)
        };
        
        setTeams(updatedTeams);
        setAvailableAssistants(prev => [...prev, draggedAssistant]);
        saveTeam(updatedTeams[teamIndex]);
      }
    }
  };

  const createNewTeam = () => {
    const newTeam: TeamWithMembers = {
      id: uuid(),
      driverUsername: "",
      assistants: [],
      driver: {} as User,
      assistantUsers: []
    };
    
    setTeams(prev => [...prev, newTeam]);
  };

  const removeTeam = async (teamIndex: number) => {
    const team = teams[teamIndex];
    
    // Return users to available pools
    if (team.driver && team.driver.username) {
      setAvailableDrivers(prev => [...prev, team.driver]);
    }
    if (team.assistantUsers.length > 0) {
      setAvailableAssistants(prev => [...prev, ...team.assistantUsers]);
    }
    
    setTeams(prev => prev.filter((_, index) => index !== teamIndex));
    
    // Remove from storage
    try {
      await storage.deleteTeam(team.id);
    } catch (error) {
      console.error("Error deleting team:", error);
    }
  };

  const saveTeam = async (team: TeamWithMembers) => {
    try {
      const teamData: Team = {
        id: team.id,
        driverUsername: team.driverUsername,
        assistants: team.assistants,
        createdAt: team.createdAt,
        updatedAt: new Date().toISOString()
      };

      const teams = await storage.getTeams();
      const existingIndex = teams.findIndex(t => t.id === team.id);
      
      if (existingIndex >= 0) {
        await storage.updateTeam(team.id, teamData);
      } else {
        await storage.createTeam(teamData);
      }
    } catch (error) {
      console.error("Error saving team:", error);
    }
  };

  const createRoute = async () => {
    if (!newRouteCity.trim() || !selectedTeamId) {
      alert("Preencha a cidade e selecione uma equipe");
      return;
    }

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    if (!selectedTeam || !selectedTeam.driver.username) {
      alert("Equipe selecionada é inválida");
      return;
    }

    const newRoute: TravelRouteWithTeam = {
      id: uuid(),
      city: newRouteCity.trim(),
      teamId: selectedTeamId,
      startDate: newRouteDate,
      status: "active",
      team: selectedTeam
    };

    setRoutes(prev => [...prev, newRoute]);
    
    // Remove team from available teams (they're now on a route)
    setTeams(prev => prev.filter(t => t.id !== selectedTeamId));
    
    // Clear form
    setNewRouteCity("");
    setNewRouteDate(toDateRefBR());
    setSelectedTeamId("");

    // Save to storage
    try {
      const routeData: TravelRoute = {
        id: newRoute.id,
        city: newRoute.city,
        teamId: newRoute.teamId,
        startDate: newRoute.startDate,
        status: newRoute.status
      };
      await storage.createTravelRoute(routeData);
    } catch (error) {
      console.error("Error creating route:", error);
    }
  };

  const finishRoute = async (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    // Mark route as completed
    const updatedRoutes = routes.map(r => 
      r.id === routeId 
        ? { ...r, status: "completed" as const, endDate: toDateRefBR() }
        : r
    );
    
    setRoutes(updatedRoutes);
    
    // Return team to available teams
    if (route.team) {
      setTeams(prev => [...prev, route.team!]);
    }

    // Update storage
    try {
      await storage.updateTravelRoute(routeId, { 
        status: "completed", 
        endDate: toDateRefBR(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error finishing route:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Montar Equipes</h1>
        <p className="text-muted-foreground">
          Organize equipes de motoristas e ajudantes para suas rotas de forma fácil e dinâmica
        </p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Available Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funcionários Disponíveis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Available Drivers */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Motoristas</Label>
                <Droppable droppableId="available-drivers">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[100px] p-2 rounded-lg border-2 border-dashed ${
                        snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      {availableDrivers
                        .filter(driver => driver.id && driver.id.trim() !== "")
                        .map((driver, index) => (
                        <Draggable key={driver.id} draggableId={driver.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-2 mb-2 bg-card border rounded-lg cursor-move ${
                                snapshot.isDragging ? "shadow-lg" : ""
                              }`}
                            >
                              <div className="font-medium text-sm">{driver.displayName}</div>
                              <Badge variant="outline">Motorista</Badge>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {availableDrivers.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          Nenhum motorista disponível
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Available Assistants */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Ajudantes</Label>
                <Droppable droppableId="available-assistants">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[100px] p-2 rounded-lg border-2 border-dashed ${
                        snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      {availableAssistants
                        .filter(assistant => assistant.id && assistant.id.trim() !== "")
                        .map((assistant, index) => (
                        <Draggable key={assistant.id} draggableId={assistant.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-2 mb-2 bg-card border rounded-lg cursor-move ${
                                snapshot.isDragging ? "shadow-lg" : ""
                              }`}
                            >
                              <div className="font-medium text-sm">{assistant.displayName}</div>
                              <Badge variant="outline">Ajudante</Badge>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {availableAssistants.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          Nenhum ajudante disponível
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            </CardContent>
          </Card>

          {/* Teams */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Equipes</CardTitle>
              <Button onClick={createNewTeam} size="sm">
                Nova Equipe
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams.map((team, index) => (
                  <div key={team.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Equipe {index + 1}</h4>
                      <Button
                        onClick={() => removeTeam(index)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        Remover
                      </Button>
                    </div>
                    
                    <Droppable droppableId={`team-${index}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[80px] p-2 rounded border-2 border-dashed space-y-1 ${
                            snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          {team.driver && team.driver.username && team.driver.id && (
                            <Draggable draggableId={team.driver.id} index={0}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-2 bg-blue-50 border border-blue-200 rounded text-sm ${
                                    snapshot.isDragging ? "shadow-lg" : ""
                                  }`}
                                >
                                  <div className="font-medium">{team.driver.displayName}</div>
                                  <Badge variant="secondary" className="text-xs">Motorista</Badge>
                                </div>
                              )}
                            </Draggable>
                          )}
                          
                          {team.assistantUsers
                            .filter(assistant => assistant.id && assistant.id.trim() !== "")
                            .map((assistant, assistantIndex) => (
                            <Draggable key={assistant.id} draggableId={assistant.id} index={assistantIndex + 1}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-2 bg-green-50 border border-green-200 rounded text-sm ${
                                    snapshot.isDragging ? "shadow-lg" : ""
                                  }`}
                                >
                                  <div className="font-medium">{assistant.displayName}</div>
                                  <Badge variant="secondary" className="text-xs">Ajudante</Badge>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          
                          {provided.placeholder}
                          
                          {(!team.driver || !team.driver.username) && team.assistantUsers.length === 0 && (
                            <div className="text-xs text-muted-foreground text-center py-2">
                              Arraste motoristas e ajudantes aqui
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
                
                {teams.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Clique em "Nova Equipe" para começar
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Route Creation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Criar Rota</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={newRouteCity}
                  onChange={(e) => setNewRouteCity(e.target.value)}
                  placeholder="Ex: São Bento do Una"
                />
              </div>
              
              <div>
                <Label htmlFor="start-date">Data de Início</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newRouteDate}
                  onChange={(e) => setNewRouteDate(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="team-select">Equipe</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams
                      .filter(team => team.driver && team.driver.username)
                      .map((team, index) => (
                        <SelectItem key={team.id} value={team.id}>
                          Equipe {index + 1} - {team.driver.displayName}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={createRoute} 
                className="w-full"
                disabled={!newRouteCity.trim() || !selectedTeamId}
              >
                Criar Rota
              </Button>
            </CardContent>
          </Card>
        </div>
      </DragDropContext>

      {/* Active Routes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rotas Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {routes.filter(r => r.status === "active").map((route) => (
              <div key={route.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{route.city}</div>
                  <div className="text-sm text-muted-foreground">
                    Início: {route.startDate} • 
                    Motorista: {route.team?.driver.displayName} • 
                    Ajudantes: {route.team?.assistantUsers.map(a => a.displayName).join(", ") || "Nenhum"}
                  </div>
                  <Badge variant="default" className="mt-1">Ativa</Badge>
                </div>
                <Button 
                  onClick={() => finishRoute(route.id)}
                  variant="outline"
                >
                  Finalizar Rota
                </Button>
              </div>
            ))}
            
            {routes.filter(r => r.status === "active").length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                Nenhuma rota ativa no momento
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completed Routes */}
      {routes.filter(r => r.status === "completed").length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Rotas Finalizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {routes.filter(r => r.status === "completed").map((route) => (
                <div key={route.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div>
                    <div className="font-medium">{route.city}</div>
                    <div className="text-sm text-muted-foreground">
                      {route.startDate} - {route.endDate} • 
                      Motorista: {route.team?.driver.displayName} • 
                      Ajudantes: {route.team?.assistantUsers.map(a => a.displayName).join(", ") || "Nenhum"}
                    </div>
                    <Badge variant="secondary" className="mt-1">Finalizada</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}