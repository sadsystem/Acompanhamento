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
import { Edit, Plus, Trash2, MapPin, Calendar, Users as UsersIcon, X, AlertTriangle } from "lucide-react";

interface NewRouteForm {
  cities: string[];
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
  const [newRoute, setNewRoute] = useState<NewRouteForm>({ cities: [], startDate: toDateRefBR() });
  const [editingRoute, setEditingRoute] = useState<TravelRouteWithTeam | null>(null);
  
  // Route action modals
  const [showRouteActionModal, setShowRouteActionModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<TravelRouteWithTeam | null>(null);
  const [pendingAction, setPendingAction] = useState<'finish' | 'delete' | null>(null);

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
      const teamId = destId.replace("team-", "");
      const draggedDriver = availableDrivers.find(d => d.id === draggableId);
      const targetRoute = routes.find(r => r.team?.id === teamId);
      
      if (draggedDriver && targetRoute && targetRoute.team) {
        
        // Remove current driver from team if exists
        if (targetRoute.team.driver && targetRoute.team.driver.username) {
          setAvailableDrivers(prev => [...prev, targetRoute.team!.driver]);
        }
        
        // Update team with new driver
        const updatedTeam = {
          ...targetRoute.team,
          driverUsername: draggedDriver.username,
          driver: draggedDriver
        };
        
        // Update routes state
        setRoutes(prev => prev.map(r => 
          r.id === targetRoute.id 
            ? { ...r, team: updatedTeam }
            : r
        ));
        
        // Update teams state
        setTeams(prev => prev.map(t => 
          t.id === teamId 
            ? updatedTeam
            : t
        ));
        
        setAvailableDrivers(prev => prev.filter(d => d.id !== draggableId));
        saveTeam(updatedTeam);
      }
    }

    if (sourceId === "available-assistants" && destId.startsWith("team-")) {
      const teamId = destId.replace("team-", "");
      const draggedAssistant = availableAssistants.find(a => a.id === draggableId);
      const targetRoute = routes.find(r => r.team?.id === teamId);
      
      if (draggedAssistant && targetRoute && targetRoute.team && targetRoute.team.assistants.length < 2) {
        
        // Update team with new assistant
        const updatedTeam = {
          ...targetRoute.team,
          assistants: [...targetRoute.team.assistants, draggedAssistant.username],
          assistantUsers: [...targetRoute.team.assistantUsers, draggedAssistant]
        };
        
        // Update routes state
        setRoutes(prev => prev.map(r => 
          r.id === targetRoute.id 
            ? { ...r, team: updatedTeam }
            : r
        ));
        
        // Update teams state
        setTeams(prev => prev.map(t => 
          t.id === teamId 
            ? updatedTeam
            : t
        ));
        
        setAvailableAssistants(prev => prev.filter(a => a.id !== draggableId));
        saveTeam(updatedTeam);
      }
    }

    // Handle removing users from teams back to available
    if (sourceId.startsWith("team-") && destId === "available-drivers") {
      const teamId = sourceId.replace("team-", "");
      const targetRoute = routes.find(r => r.team?.id === teamId);
      
      if (targetRoute && targetRoute.team && targetRoute.team.driver && targetRoute.team.driver.id === draggableId) {
        const driverToRemove = targetRoute.team.driver;
        
        // Update team
        const updatedTeam = {
          ...targetRoute.team,
          driverUsername: "",
          driver: {} as User
        };
        
        // Update routes state
        setRoutes(prev => prev.map(r => 
          r.id === targetRoute.id 
            ? { ...r, team: updatedTeam }
            : r
        ));
        
        // Update teams state
        setTeams(prev => prev.map(t => 
          t.id === teamId 
            ? updatedTeam
            : t
        ));
        
        setAvailableDrivers(prev => [...prev, driverToRemove]);
        saveTeam(updatedTeam);
      }
    }

    if (sourceId.startsWith("team-") && destId === "available-assistants") {
      const teamId = sourceId.replace("team-", "");
      const targetRoute = routes.find(r => r.team?.id === teamId);
      const draggedAssistant = targetRoute?.team?.assistantUsers.find(a => a.id === draggableId);
      
      if (draggedAssistant && targetRoute && targetRoute.team) {
        // Update team
        const updatedTeam = {
          ...targetRoute.team,
          assistants: targetRoute.team.assistants.filter(username => username !== draggedAssistant.username),
          assistantUsers: targetRoute.team.assistantUsers.filter(a => a.id !== draggableId)
        };
        
        // Update routes state
        setRoutes(prev => prev.map(r => 
          r.id === targetRoute.id 
            ? { ...r, team: updatedTeam }
            : r
        ));
        
        // Update teams state
        setTeams(prev => prev.map(t => 
          t.id === teamId 
            ? updatedTeam
            : t
        ));
        
        setAvailableAssistants(prev => [...prev, draggedAssistant]);
        saveTeam(updatedTeam);
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
    if (newRoute.cities.length === 0) {
      alert("Por favor, selecione pelo menos uma cidade");
      return;
    }

    try {
      // Create route title with multiple cities
      const routeTitle = newRoute.cities.length === 1 
        ? newRoute.cities[0]
        : `${newRoute.cities[0]} + ${newRoute.cities.length - 1} cidades`;
      
      // Check if similar route already exists
      const existingRoute = routes.find(r => r.city === routeTitle && r.status === "active");
      let finalRouteTitle = routeTitle;
      
      if (existingRoute) {
        // Find the highest "Parte" number for this route
        const similarRoutes = routes.filter(r => r.city.startsWith(routeTitle));
        const parts = similarRoutes.map(r => {
          const match = r.city.match(/- Parte (\d+)$/);
          return match ? parseInt(match[1]) : 1;
        });
        const nextPart = Math.max(...parts) + 1;
        finalRouteTitle = `${routeTitle} - Parte ${nextPart}`;
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
        city: finalRouteTitle,
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
      setNewRoute({ cities: [], startDate: toDateRefBR() });
      setCitySearch("");
      setShowNewRouteModal(false);
    } catch (error) {
      console.error("Error creating route:", error);
      alert("Erro ao criar rota. Tente novamente.");
    }
  };

  const handleEditRoute = (route: TravelRouteWithTeam) => {
    setEditingRoute(route);
    // For editing, convert back to single city (simplified approach)
    const cityName = route.city.replace(/^(.+?)( - Parte \d+)?$/, '$1').split(' + ')[0];
    setNewRoute({ cities: [cityName], startDate: route.startDate });
    setCitySearch("");
    setShowNewRouteModal(true);
  };

  const handleUpdateRoute = async () => {
    if (!editingRoute || newRoute.cities.length === 0) return;

    try {
      const routeTitle = newRoute.cities.length === 1 
        ? newRoute.cities[0]
        : `${newRoute.cities[0]} + ${newRoute.cities.length - 1} cidades`;
        
      await storage.updateTravelRoute(editingRoute.id, {
        city: routeTitle,
        startDate: newRoute.startDate,
        updatedAt: new Date().toISOString()
      });

      // Update state
      setRoutes(prev => prev.map(r => 
        r.id === editingRoute.id 
          ? { ...r, city: routeTitle, startDate: newRoute.startDate }
          : r
      ));

      // Reset and close
      setEditingRoute(null);
      setNewRoute({ cities: [], startDate: toDateRefBR() });
      setCitySearch("");
      setShowNewRouteModal(false);
    } catch (error) {
      console.error("Error updating route:", error);
      alert("Erro ao atualizar rota. Tente novamente.");
    }
  };

  const openRouteActionModal = (route: TravelRouteWithTeam) => {
    setSelectedRoute(route);
    setShowRouteActionModal(true);
  };

  const closeRouteActionModal = () => {
    setShowRouteActionModal(false);
    setSelectedRoute(null);
    setPendingAction(null);
  };

  const handleActionChoice = (action: 'finish' | 'delete') => {
    setPendingAction(action);
    setShowRouteActionModal(false);
    setShowConfirmationModal(true);
  };

  const closeConfirmationModal = () => {
    setShowConfirmationModal(false);
    setSelectedRoute(null);
    setPendingAction(null);
  };

  const executeAction = async () => {
    if (!selectedRoute || !pendingAction) return;

    try {
      if (pendingAction === 'finish') {
        await finishRoute(selectedRoute.id);
      } else if (pendingAction === 'delete') {
        await deleteRoute(selectedRoute.id);
      }
      closeConfirmationModal();
    } catch (error) {
      console.error(`Error ${pendingAction}ing route:`, error);
      alert(`Erro ao ${pendingAction === 'finish' ? 'finalizar' : 'excluir'} rota`);
    }
  };

  const finishRoute = async (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

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
  };

  const deleteRoute = async (routeId: string) => {
    const routeToDelete = routes.find(r => r.id === routeId);
    if (!routeToDelete) return;
    
    // Make team members available again
    if (routeToDelete.team) {
      if (routeToDelete.team.driver && routeToDelete.team.driver.username) {
        setAvailableDrivers(prev => [...prev, routeToDelete.team!.driver]);
      }
      if (routeToDelete.team.assistantUsers.length > 0) {
        setAvailableAssistants(prev => [...prev, ...routeToDelete.team!.assistantUsers]);
      }
    }

    // Remove from storage
    await storage.deleteTravelRoute(routeId);
    if (routeToDelete.team) {
      await storage.deleteTeam(routeToDelete.team.id);
    }

    // Update state
    setRoutes(prev => prev.filter(r => r.id !== routeId));
    setTeams(prev => prev.filter(t => t.id !== routeToDelete?.team?.id));
    
    updateAvailableUsers(drivers, assistants, teams.filter(t => t.id !== routeToDelete?.team?.id), routes.filter(r => r.id !== routeId));
  };

  const selectCity = (city: string) => {
    if (!newRoute.cities.includes(city)) {
      setNewRoute(prev => ({ ...prev, cities: [...prev.cities, city] }));
    }
    setCitySearch("");
  };

  const removeCity = (cityToRemove: string) => {
    setNewRoute(prev => ({
      ...prev,
      cities: prev.cities.filter(city => city !== cityToRemove)
    }));
  };

  const closeModal = () => {
    setShowNewRouteModal(false);
    setEditingRoute(null);
    setNewRoute({ cities: [], startDate: toDateRefBR() });
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
              <Label htmlFor="city">Cidades de Destino</Label>
              <Input
                id="city"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="Digite para buscar e adicionar cidades..."
                className="mb-2"
              />
              
              {citySearch && filteredCities.length > 0 && (
                <div className="max-h-32 overflow-y-auto border rounded-lg mb-2">
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
              
              {newRoute.cities.length > 0 && (
                <div className="mt-2">
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Cidades Selecionadas:
                  </Label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {newRoute.cities.map(city => (
                      <div
                        key={city}
                        className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded text-sm"
                      >
                        <span>{city}</span>
                        <Button
                          onClick={() => removeCity(city)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
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
              disabled={newRoute.cities.length === 0}
            >
              {editingRoute ? "Atualizar" : "Criar Rota"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Ajudantes Disponíveis - Coluna 1 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UsersIcon className="w-5 h-5" />
                Ajudantes Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="available-assistants">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[300px] p-2 rounded-lg border-2 border-dashed ${
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
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleEditRoute(route)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => openRouteActionModal(route)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {route.team && (
                      <Droppable droppableId={`team-${route.team?.id}`}>
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

          {/* Motoristas Disponíveis - Coluna 3 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UsersIcon className="w-5 h-5" />
                Motoristas Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="available-drivers">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[300px] p-2 rounded-lg border-2 border-dashed ${
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
            </CardContent>
          </Card>
        </div>
      </DragDropContext>

      {/* Rotas Ativas - Agora horizontal */}
      {routes.filter(r => r.status === "active").length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Rotas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => openRouteActionModal(route)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Finalizar Rota
                    </Button>
                    <Button 
                      onClick={() => openRouteActionModal(route)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rotas Finalizadas */}
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

      {/* Modal de Ação da Rota */}
      <Dialog open={showRouteActionModal} onOpenChange={setShowRouteActionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ações da Rota</DialogTitle>
          </DialogHeader>
          
          {selectedRoute && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong>Rota:</strong> {selectedRoute.city}
              </div>
              
              <div className="space-y-2">
                <Button
                  onClick={() => handleActionChoice('finish')}
                  className="w-full flex items-center gap-2"
                  variant="default"
                >
                  <Calendar className="w-4 h-4" />
                  Finalizar Rota
                </Button>
                
                <Button
                  onClick={() => handleActionChoice('delete')}
                  className="w-full flex items-center gap-2"
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Rota
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={closeRouteActionModal}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação */}
      <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Ação
            </DialogTitle>
          </DialogHeader>
          
          {selectedRoute && pendingAction && (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="mb-2">
                  {pendingAction === 'finish' 
                    ? 'Tem certeza que deseja finalizar esta rota?' 
                    : 'Tem certeza que deseja excluir esta rota?'
                  }
                </p>
                <div className="p-3 bg-muted rounded text-xs">
                  <strong>Rota:</strong> {selectedRoute.city}<br/>
                  <strong>Data:</strong> {selectedRoute.startDate}
                  {selectedRoute.team && (
                    <>
                      <br/><strong>Motorista:</strong> {selectedRoute.team.driver?.displayName || 'Não definido'}
                      <br/><strong>Ajudantes:</strong> {selectedRoute.team.assistantUsers?.map(a => a.displayName).join(', ') || 'Nenhum'}
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {pendingAction === 'finish'
                    ? 'A rota será marcada como finalizada e os funcionários ficarão disponíveis novamente.'
                    : 'Esta ação não pode ser desfeita. A rota e a equipe serão permanentemente removidas.'
                  }
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeConfirmationModal}>
              Cancelar
            </Button>
            <Button 
              onClick={executeAction}
              variant={pendingAction === 'delete' ? 'destructive' : 'default'}
              className="flex items-center gap-2"
            >
              {pendingAction === 'finish' ? (
                <>
                  <Calendar className="w-4 h-4" />
                  Confirmar Finalização
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}