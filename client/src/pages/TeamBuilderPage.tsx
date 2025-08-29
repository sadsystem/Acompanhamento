import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { useStorage } from "../hooks/useStorage";
import { User, Team, TeamWithMembers, TravelRoute, TravelRouteWithTeam } from "../config/types";
import { toDateRefBR } from "../utils/time";
import { uuid } from "../utils/calc";
import { searchCities } from "../data/cities-pe";
import { Edit, Plus, Trash2, MapPin, Calendar, Users as UsersIcon } from "lucide-react";

interface NewRouteForm {
  city: string;
  startDate: string;
}

export function TeamBuilderPage() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [assistants, setAssistants] = useState<User[]>([]);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [routes, setRoutes] = useState<TravelRouteWithTeam[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<User[]>([]);
  const [availableAssistants, setAvailableAssistants] = useState<User[]>([]);
  
  // Modal states
  const [showNewRouteModal, setShowNewRouteModal] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [newRoute, setNewRoute] = useState<NewRouteForm>({ city: "", startDate: toDateRefBR() });
  const [editingRoute, setEditingRoute] = useState<TravelRouteWithTeam | null>(null);

  const storage = useStorage();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setFilteredCities(searchCities(citySearch));
  }, [citySearch]);

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
        if (updatedTeams[teamIndex].driver && updatedTeams[teamIndex].driver.username) {
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

  const handleCreateRoute = async () => {
    if (!newRoute.city.trim()) {
      alert("Por favor, selecione uma cidade");
      return;
    }

    try {
      // Check if city already has an active route
      const existingRoute = routes.find(r => r.city === newRoute.city && r.status === "active");
      let routeTitle = newRoute.city;
      
      if (existingRoute) {
        // Find the highest "Parte" number for this city
        const cityRoutes = routes.filter(r => r.city === newRoute.city);
        const parts = cityRoutes.map(r => {
          const match = r.city.match(/- Parte (\d+)$/);
          return match ? parseInt(match[1]) : 1;
        });
        const nextPart = Math.max(...parts) + 1;
        routeTitle = `${newRoute.city} - Parte ${nextPart}`;
      }

      // Create new team for this route
      const newTeam: TeamWithMembers = {
        id: uuid(),
        driverUsername: "",
        assistants: [],
        driver: {} as User,
        assistantUsers: [],
        createdAt: new Date().toISOString()
      };

      // Save team
      await storage.createTeam({
        id: newTeam.id,
        driverUsername: newTeam.driverUsername,
        assistants: newTeam.assistants,
        createdAt: newTeam.createdAt
      });

      // Create route
      const routeData: TravelRoute = {
        id: uuid(),
        city: routeTitle,
        teamId: newTeam.id,
        startDate: newRoute.startDate,
        status: "active"
      };

      await storage.createTravelRoute(routeData);

      // Add to state
      const newRouteWithTeam: TravelRouteWithTeam = {
        ...routeData,
        team: newTeam
      };

      setTeams(prev => [...prev, newTeam]);
      setRoutes(prev => [...prev, newRouteWithTeam]);

      // Reset form and close modal
      setNewRoute({ city: "", startDate: toDateRefBR() });
      setCitySearch("");
      setShowNewRouteModal(false);
    } catch (error) {
      console.error("Error creating route:", error);
      alert("Erro ao criar rota. Tente novamente.");
    }
  };

  const handleEditRoute = (route: TravelRouteWithTeam) => {
    setEditingRoute(route);
    setNewRoute({ city: route.city.replace(/^(.+?)( - Parte \d+)?$/, '$1'), startDate: route.startDate });
    setCitySearch(route.city.replace(/^(.+?)( - Parte \d+)?$/, '$1'));
    setShowNewRouteModal(true);
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute || !newRoute.city.trim()) return;

    try {
      await storage.updateTravelRoute(editingRoute.id, {
        city: newRoute.city,
        startDate: newRoute.startDate,
        updatedAt: new Date().toISOString()
      });

      // Update state
      setRoutes(prev => prev.map(r => 
        r.id === editingRoute.id 
          ? { ...r, city: newRoute.city, startDate: newRoute.startDate }
          : r
      ));

      // Reset and close
      setEditingRoute(null);
      setNewRoute({ city: "", startDate: toDateRefBR() });
      setCitySearch("");
      setShowNewRouteModal(false);
    } catch (error) {
      console.error("Error updating route:", error);
      alert("Erro ao atualizar rota. Tente novamente.");
    }
  };

  const finishRoute = async (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    try {
      // Mark route as completed
      await storage.updateTravelRoute(routeId, { 
        status: "completed", 
        endDate: toDateRefBR(),
        updatedAt: new Date().toISOString()
      });

      // Update state
      const updatedRoutes = routes.map(r => 
        r.id === routeId 
          ? { ...r, status: "completed" as const, endDate: toDateRefBR() }
          : r
      );
      
      setRoutes(updatedRoutes);
      
      // Return team to available teams and remove from current teams
      if (route.team) {
        if (route.team.driver && route.team.driver.username) {
          setAvailableDrivers(prev => [...prev, route.team!.driver]);
        }
        if (route.team.assistantUsers.length > 0) {
          setAvailableAssistants(prev => [...prev, ...route.team!.assistantUsers]);
        }
        
        // Remove team from teams list
        setTeams(prev => prev.filter(t => t.id !== route.teamId));
        await storage.deleteTeam(route.teamId!);
      }

      updateAvailableUsers(drivers, assistants, teams, updatedRoutes);
    } catch (error) {
      console.error("Error finishing route:", error);
    }
  };

  const selectCity = (city: string) => {
    setNewRoute(prev => ({ ...prev, city }));
    setCitySearch(city);
  };

  const closeModal = () => {
    setShowNewRouteModal(false);
    setEditingRoute(null);
    setNewRoute({ city: "", startDate: toDateRefBR() });
    setCitySearch("");
  };

  const getRouteTitle = (route: TravelRouteWithTeam) => {
    return route.city || "Equipe Sem Rota";
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Montar Equipes</h1>
        <p className="text-lg text-muted-foreground">
          Organize equipes de motoristas e ajudantes para suas rotas de forma fácil e dinâmica
        </p>
      </div>

      <div className="text-center mb-6">
        {/* New Route Modal */}
        <Dialog open={showNewRouteModal} onOpenChange={setShowNewRouteModal}>
          <DialogTrigger asChild>
            <Button size="lg" className="px-8 py-3">
              <Plus className="w-4 h-4 mr-2" />
              Criar Rota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRoute ? "Editar Rota" : "Criar Nova Rota"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="city">Cidade de Destino</Label>
              <Input
                id="city"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="Digite para buscar cidade..."
                className="mb-2"
              />
              
              {citySearch && filteredCities.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded-lg">
                  {filteredCities.map(city => (
                    <div
                      key={city}
                      onClick={() => selectCity(city)}
                      className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b last:border-b-0"
                    >
                      {city}
                    </div>
                  ))}
                </div>
              )}
              
              {newRoute.city && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                  <strong>Selecionado:</strong> {newRoute.city}
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="start-date">Data de Início</Label>
              <Input
                id="start-date"
                type="date"
                value={newRoute.startDate}
                onChange={(e) => setNewRoute(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button 
              onClick={editingRoute ? handleUpdateRoute : handleCreateRoute}
              disabled={!newRoute.city.trim()}
            >
              {editingRoute ? "Atualizar" : "Criar Rota"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Available Users - Reorganized */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UsersIcon className="w-5 h-5" />
                Funcionários Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                
                {/* Assistants on the left */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Ajudantes
                  </Label>
                  <Droppable droppableId="available-assistants">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[200px] p-2 rounded-lg border-2 border-dashed ${
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
                                <div className="font-medium text-xs">
                                  {assistant.displayName.split(' ').slice(0, 2).join(' ')}
                                </div>
                                <Badge variant="outline">Ajudante</Badge>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {availableAssistants.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            Nenhum ajudante disponível
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Drivers on the right */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Motoristas
                  </Label>
                  <Droppable droppableId="available-drivers">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[200px] p-2 rounded-lg border-2 border-dashed ${
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
                                <div className="font-medium text-xs">
                                  {driver.displayName.split(' ').slice(0, 2).join(' ')}
                                </div>
                                <Badge variant="outline">Motorista</Badge>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {availableDrivers.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            Nenhum motorista disponível
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teams with City Names */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Equipes por Rota</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routes.filter(r => r.status === "active").map((route) => (
                  <div key={route.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {getRouteTitle(route)}
                        </h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {route.startDate}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleEditRoute(route)}
                        variant="ghost"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {route.team && (
                      <Droppable droppableId={`team-${routes.indexOf(route)}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[80px] p-2 rounded border-2 border-dashed space-y-1 ${
                              snapshot.isDraggingOver ? "border-primary bg-primary/5" : "border-border"
                            }`}
                          >
                            {route.team?.driver && route.team.driver.username && route.team.driver.id && (
                              <Draggable draggableId={route.team.driver.id} index={0}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-2 bg-blue-50 border border-blue-200 rounded text-sm ${
                                      snapshot.isDragging ? "shadow-lg" : ""
                                    }`}
                                  >
                                    <div className="font-medium text-xs">
                                      {route.team?.driver.displayName.split(' ').slice(0, 2).join(' ')}
                                    </div>
                                    <Badge variant="secondary" className="text-xs">Motorista</Badge>
                                  </div>
                                )}
                              </Draggable>
                            )}
                            
                            {route.team?.assistantUsers
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
                                    <div className="font-medium text-xs">
                                      {assistant.displayName.split(' ').slice(0, 2).join(' ')}
                                    </div>
                                    <Badge variant="secondary" className="text-xs">Ajudante</Badge>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            
                            {provided.placeholder}
                            
                            {(!route.team?.driver || !route.team.driver.username) && (route.team?.assistantUsers.length || 0) === 0 && (
                              <div className="text-xs text-muted-foreground text-center py-2">
                                Arraste funcionários aqui
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    )}
                  </div>
                ))}
                
                {routes.filter(r => r.status === "active").length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Clique em "Nova Equipe" para criar uma rota
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Routes Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rotas Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {routes.filter(r => r.status === "active").map((route) => (
                  <div key={route.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{route.city}</h4>
                        <p className="text-xs text-muted-foreground">
                          Início: {route.startDate}
                        </p>
                      </div>
                      <Badge variant="default">Ativa</Badge>
                    </div>
                    
                    {route.team && (
                      <div className="text-xs text-muted-foreground mb-2">
                        <div>Motorista: {route.team.driver?.displayName || "Não definido"}</div>
                        <div>
                          Ajudantes: {(route.team.assistantUsers?.length || 0) > 0 
                            ? route.team.assistantUsers?.map(a => a.displayName).join(", ")
                            : "Nenhum"
                          }
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => finishRoute(route.id)}
                      variant="outline"
                      size="sm"
                      className="w-full"
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
        </div>
      </DragDropContext>

      {/* Completed Routes */}
      {routes.filter(r => r.status === "completed").length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Rotas Finalizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {routes.filter(r => r.status === "completed").map((route) => (
                <div key={route.id} className="border rounded-lg p-3 bg-muted/30">
                  <h4 className="font-medium">{route.city}</h4>
                  <p className="text-sm text-muted-foreground">
                    {route.startDate} - {route.endDate}
                  </p>
                  {route.team && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <div>Motorista: {route.team.driver?.displayName || "N/A"}</div>
                      <div>
                        Ajudantes: {(route.team?.assistantUsers?.length || 0) > 0 
                          ? route.team?.assistantUsers?.map(a => a.displayName).join(", ")
                          : "Nenhum"
                        }
                      </div>
                    </div>
                  )}
                  <Badge variant="secondary" className="mt-2">Finalizada</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}