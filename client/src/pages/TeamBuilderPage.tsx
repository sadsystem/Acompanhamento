import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../components/ui/dialog";
import { useStorage } from "../hooks/useStorage";
import { User, Team, TeamWithMembers, TravelRoute, TravelRouteWithTeam, Vehicle } from "../config/types";
import { toDateRefBR } from "../utils/time";
import { uuid } from "../utils/calc";
import { searchCities } from "../data/cities-pe";
import { Edit, Plus, Trash2, MapPin, Calendar, Users as UsersIcon, X, AlertTriangle, CheckCircle, Check, Download, Route, Truck, Navigation, Archive, ChevronLeft, ChevronRight, Car } from "lucide-react";

// Function to get role badge styling
const getRoleBadgeStyle = (role: string) => {
  const styles = {
    "Motorista": "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
    "Ajudante": "bg-green-100 text-green-800 border-green-200 hover:bg-green-200", 
    "Supervisor": "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
    "Gerente": "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
    "Assistente de Logística": "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200"
  };
  return styles[role as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
};

interface NewRouteForm {
  cities: string[];
  startDate: string;
}

export function TeamBuilderPage() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [assistants, setAssistants] = useState<User[]>([]);
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [routes, setRoutes] = useState<TravelRouteWithTeam[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
  const [actionContext, setActionContext] = useState<'finish' | 'delete' | null>(null);
  
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFinishedExportModal, setShowFinishedExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return { startDate: today, endDate: today };
  });
  
  // Pagination for finished routes
  const [finishedRoutesPage, setFinishedRoutesPage] = useState(0);
  const ROUTES_PER_PAGE = 9;
  
  // Vehicle modal states
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [selectedRouteForVehicle, setSelectedRouteForVehicle] = useState<TravelRouteWithTeam | null>(null);
  const [newVehicleData, setNewVehicleData] = useState({ plate: "", model: "", year: "" });

  const handleConfirmRoute = async (route: TravelRouteWithTeam) => {
    try {
      await storage.updateTravelRoute(route.id, {
        status: "active",
        updatedAt: new Date().toISOString()
      });
      
      // Update state
      setRoutes(prev => prev.map(r => 
        r.id === route.id 
          ? { ...r, status: "active" as const }
          : r
      ));
    } catch (error) {
      console.error("Error confirming route:", error);
      alert("Erro ao confirmar rota. Tente novamente.");
    }
  };

  const storage = useStorage();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setFilteredCities(searchCities(citySearch));
  }, [citySearch]);

  const initializeDefaultVehicles = async () => {
    const defaultVehicles: Vehicle[] = [
      {
        id: uuid(),
        plate: "PDO-0000",
        model: "Não especificado",
        year: new Date().getFullYear(),
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: uuid(),
        plate: "SNN-0000", 
        model: "Não especificado",
        year: new Date().getFullYear(),
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: uuid(),
        plate: "KIF-0000",
        model: "Não especificado", 
        year: new Date().getFullYear(),
        active: true,
        createdAt: new Date().toISOString()
      }
    ];

    for (const vehicle of defaultVehicles) {
      await storage.createVehicle(vehicle);
    }
    
    return defaultVehicles;
  };

  const loadData = async () => {
    try {
      const users = await storage.getUsers();
      const driversData = users.filter(u => u.active && u.cargo === "Motorista");
      const assistantsData = users.filter(u => u.active && u.cargo === "Ajudante");
      
      setDrivers(driversData);
      setAssistants(assistantsData);

      // Load teams, routes and vehicles from storage
      const [teamsData, routesData, vehiclesData] = await Promise.all([
        storage.getTeams(),
        storage.getTravelRoutes(),
        storage.getVehicles()
      ]);

      // Initialize default vehicles if none exist
      if (vehiclesData.length === 0) {
        const defaultVehicles = await initializeDefaultVehicles();
        setVehicles(defaultVehicles);
      } else {
        setVehicles(vehiclesData);
      }

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

      // Convert routes to TravelRouteWithTeam e migra rotas antigas
      const routesWithTeam: TravelRouteWithTeam[] = routesData.map(route => {
        const team = teamsWithMembers.find(t => t.id === route.teamId);
        const vehicle = vehiclesData.find(v => v.id === route.vehicleId);
        
        // Migração: se não tem o campo cities, cria baseado no city
        let cities = route.cities;
        if (!cities || !Array.isArray(cities) || cities.length === 0) {
          if (route.city && route.city.includes(" + ") && route.city.includes(" cidades")) {
            // Para rotas resumidas, usar apenas a primeira cidade (limitação)
            const firstCity = route.city.split(" + ")[0];
            cities = [firstCity];
          } else {
            cities = [route.city || "Cidade não definida"];
          }
        }
        
        return {
          ...route,
          cities,
          team,
          vehicle
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
        
        setAvailableDrivers(prev => {
          // Evitar duplicatas verificando se o motorista já existe na lista
          const alreadyExists = prev.some(d => d.id === driverToRemove.id);
          if (alreadyExists) {
            return prev;
          }
          return [...prev, driverToRemove];
        });
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
        
        setAvailableAssistants(prev => {
          // Evitar duplicatas verificando se o assistente já existe na lista
          const alreadyExists = prev.some(a => a.id === draggedAssistant.id);
          if (alreadyExists) {
            return prev;
          }
          return [...prev, draggedAssistant];
        });
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
        cities: newRoute.cities, // Salva a lista completa de cidades
        teamId: newTeam.id,
        startDate: newRoute.startDate,
        status: "formation"
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
    // Usa a lista completa de cidades se disponível
    const cities = route.cities && route.cities.length > 0 ? route.cities : [route.city || ""];
    setNewRoute({ cities: [...cities], startDate: route.startDate });
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
        cities: newRoute.cities, // Atualiza a lista completa de cidades
        startDate: newRoute.startDate,
        updatedAt: new Date().toISOString()
      });

      // Update state
      setRoutes(prev => prev.map(r => 
        r.id === editingRoute.id 
          ? { ...r, city: routeTitle, cities: newRoute.cities, startDate: newRoute.startDate }
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

  const openRouteActionModal = (route: TravelRouteWithTeam, action?: 'finish' | 'delete') => {
    setSelectedRoute(route);
    setActionContext(action || null);
    setShowRouteActionModal(true);
  };

  const closeRouteActionModal = () => {
    setShowRouteActionModal(false);
    setSelectedRoute(null);
    setPendingAction(null);
    setActionContext(null);
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

  const getDetailedRouteTitle = (route: TravelRouteWithTeam) => {
    // Usa a lista de cidades se disponível, senão usa o campo city
    const cities = route.cities && route.cities.length > 0 ? route.cities : [route.city || "Equipe Sem Rota"];
    
    if (cities.length === 1) {
      return {
        main: cities[0],
        subtitle: null,
        isMultiple: false
      };
    }
    
    // Para múltiplas cidades, mostra todas
    return {
      main: cities[0],
      subtitle: cities.slice(1).join(", "),
      isMultiple: true
    };
  };

  // Finished routes pagination
  const getFinishedRoutesPage = () => {
    const finishedRoutes = routes.filter(r => r.status === "completed");
    const startIndex = finishedRoutesPage * ROUTES_PER_PAGE;
    const endIndex = startIndex + ROUTES_PER_PAGE;
    return finishedRoutes.slice(startIndex, endIndex);
  };

  const getTotalFinishedPages = () => {
    const finishedRoutes = routes.filter(r => r.status === "completed");
    return Math.ceil(finishedRoutes.length / ROUTES_PER_PAGE);
  };

  // Export functions
  const exportToXLSX = async () => {
    const XLSX = await import('xlsx');
    const activeRoutes = routes.filter(r => r.status === "active");
    
    const data = activeRoutes.map((route, index) => ({
      'Nº': index + 1,
      'Rota': getAllCitiesFormatted(route),
      'Data de Início': formatDateToBR(route.startDate),
      'Status': route.vehicle ? 'OK' : 'Pendente',
      'Motorista': route.team?.driver?.displayName || 'Não definido',
      'Ajudantes': route.team?.assistantUsers?.map(a => a.displayName).join(', ') || 'Nenhum',
      'Veículo': route.vehicle?.plate || 'Não definido',
      'CPF Motorista': route.team?.driver?.cpf || 'Não informado',
      'Telefone Motorista': route.team?.driver?.phone || 'Não informado'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rotas em andamento");
    
    // Auto-size columns
    const cols = [
      { wch: 5 },   // Nº
      { wch: 40 },  // Rota
      { wch: 15 },  // Data
      { wch: 10 },  // Status
      { wch: 25 },  // Motorista
      { wch: 30 },  // Ajudantes
      { wch: 15 },  // Veículo
      { wch: 20 },  // CPF
      { wch: 20 }   // Telefone
    ];
    ws['!cols'] = cols;
    
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    XLSX.writeFile(wb, `rotas-em-andamento-${timestamp}.xlsx`);
    setShowExportModal(false);
  };
  
  const exportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    
    const activeRoutes = routes.filter(r => r.status === "active");
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Relatório de Rotas em andamento', 14, 22);
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);
    
    // Table data
    const tableData = activeRoutes.map((route, index) => [
      index + 1,
      getAllCitiesFormatted(route),
      formatDateToBR(route.startDate),
      route.team?.driver?.displayName || 'Não definido',
      route.team?.assistantUsers?.map(a => a.displayName).join(', ') || 'Nenhum',
      route.vehicle?.plate || 'Não definido'
    ]);
    
    autoTable(doc, {
      head: [['Nº', 'Rota', 'Data', 'Motorista', 'Ajudantes', 'Veículo']],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 50 },
        2: { halign: 'center', cellWidth: 25 },
        3: { cellWidth: 40 },
        4: { cellWidth: 35 },
        5: { cellWidth: 25 }
      }
    });
    
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    doc.save(`rotas-em-andamento-${timestamp}.pdf`);
    setShowExportModal(false);
  };
  
  const exportFinishedToXLSX = async () => {
    const XLSX = await import('xlsx');
    let finishedRoutes = routes.filter(r => r.status === "completed");
    
    // Filter by date range if provided
    if (exportDateRange.startDate || exportDateRange.endDate) {
      finishedRoutes = finishedRoutes.filter(route => {
        const routeDate = new Date(route.startDate);
        const startDate = exportDateRange.startDate ? new Date(exportDateRange.startDate) : null;
        const endDate = exportDateRange.endDate ? new Date(exportDateRange.endDate) : null;
        
        if (startDate && routeDate < startDate) return false;
        if (endDate && routeDate > endDate) return false;
        return true;
      });
    }
    
    const data = finishedRoutes.map((route, index) => ({
      'Nº': index + 1,
      'Rota': getAllCitiesFormatted(route),
      'Data de Início': formatDateToBR(route.startDate),
      'Data de Fim': formatDateToBR(route.endDate || route.startDate),
      'Status': 'Finalizada',
      'Motorista': route.team?.driver?.displayName || 'Não definido',
      'Ajudantes': route.team?.assistantUsers?.map(a => a.displayName).join(', ') || 'Nenhum',
      'Veículo': route.vehicle?.plate || 'Não definido',
      'CPF Motorista': route.team?.driver?.cpf || 'Não informado',
      'Telefone Motorista': route.team?.driver?.phone || 'Não informado'
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rotas Finalizadas");
    
    const cols = [
      { wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
    ];
    ws['!cols'] = cols;
    
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `rotas-finalizadas-${timestamp}.xlsx`);
    setShowFinishedExportModal(false);
    setExportDateRange({ startDate: "", endDate: "" });
  };
  
  const exportFinishedToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    
    let finishedRoutes = routes.filter(r => r.status === "completed");

    // Filter by date range if provided
    if (exportDateRange.startDate || exportDateRange.endDate) {
      finishedRoutes = finishedRoutes.filter(route => {
        const routeDate = new Date(route.startDate);
        const startDate = exportDateRange.startDate ? new Date(exportDateRange.startDate) : null;
        const endDate = exportDateRange.endDate ? new Date(exportDateRange.endDate) : null;
        
        if (startDate && routeDate < startDate) return false;
        if (endDate && routeDate > endDate) return false;
        return true;
      });
    }
    
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Rotas Finalizadas', 14, 22);
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);
    
    if (exportDateRange.startDate || exportDateRange.endDate) {
      const periodText = `Período: ${exportDateRange.startDate || 'Início'} a ${exportDateRange.endDate || 'Fim'}`;
      doc.text(periodText, 14, 42);
    }
    
    const tableData = finishedRoutes.map((route, index) => [
      index + 1,
      getAllCitiesFormatted(route),
      formatDateToBR(route.startDate),
      formatDateToBR(route.endDate || route.startDate),
      route.team?.driver?.displayName || 'Não definido',
      route.vehicle?.plate || 'Não definido'
    ]);
    
    autoTable(doc, {
      head: [['Nº', 'Rota', 'Início', 'Fim', 'Motorista', 'Veículo']],
      body: tableData,
      startY: exportDateRange.startDate || exportDateRange.endDate ? 50 : 40,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 45 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 25 },
        4: { cellWidth: 40 },
        5: { cellWidth: 25 }
      }
    });
    
    const timestamp = new Date().toISOString().split('T')[0];
    doc.save(`rotas-finalizadas-${timestamp}.pdf`);
    setShowFinishedExportModal(false);
    setExportDateRange({ startDate: "", endDate: "" });
  };

  // Vehicle functions
  const handleDefineVehicle = (route: TravelRouteWithTeam) => {
    setSelectedRouteForVehicle(route);
    setShowVehicleModal(true);
  };

  const handleSelectVehicle = async (vehicle: Vehicle) => {
    if (!selectedRouteForVehicle) return;
    
    try {
      await storage.updateTravelRoute(selectedRouteForVehicle.id, {
        vehicleId: vehicle.id,
        updatedAt: new Date().toISOString()
      });
      
      // Update state
      setRoutes(prev => prev.map(r => 
        r.id === selectedRouteForVehicle.id 
          ? { ...r, vehicle, vehicleId: vehicle.id }
          : r
      ));
      
      setShowVehicleModal(false);
      setSelectedRouteForVehicle(null);
    } catch (error) {
      console.error("Error assigning vehicle:", error);
      alert("Erro ao definir veículo. Tente novamente.");
    }
  };

  const handleCreateVehicle = async () => {
    if (!newVehicleData.plate.trim()) {
      alert("Placa é obrigatória!");
      return;
    }

    try {
      const newVehicle: Vehicle = {
        id: uuid(),
        plate: newVehicleData.plate.toUpperCase(),
        model: newVehicleData.model || "Não especificado",
        year: newVehicleData.year ? parseInt(newVehicleData.year) : new Date().getFullYear(),
        active: true,
        createdAt: new Date().toISOString()
      };

      await storage.createVehicle(newVehicle);
      setVehicles(prev => [...prev, newVehicle]);
      setNewVehicleData({ plate: "", model: "", year: "" });
      setShowNewVehicleModal(false);
      alert("Veículo registrado com sucesso!");
    } catch (error) {
      console.error("Error creating vehicle:", error);
      alert("Erro ao registrar veículo. Tente novamente.");
    }
  };

  // Helper function to format date to Brazilian format
  const formatDateToBR = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getAllCitiesFormatted = (route: TravelRouteWithTeam) => {
    // Usa a lista de cidades se disponível, senão usa o campo city
    const cities = route.cities && route.cities.length > 0 ? route.cities : [route.city || "Equipe Sem Rota"];
    return cities.join(", ");
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
            <DialogDescription>
              {editingRoute ? "Modifique as informações da rota existente" : "Configure uma nova rota selecionando cidades e definindo a data de início"}
            </DialogDescription>
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
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
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
                    className={`min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg ${
                      snapshot.isDraggingOver ? "border-2 border-primary border-dashed bg-primary/5 p-2" : ""
                    }`}
                  >
                    {availableAssistants
                      .filter(assistant => assistant.id && assistant.id.trim() !== "")
                      .map((assistant, index) => (
                      <Draggable key={`available-assistant-${assistant.id}-${index}`} draggableId={assistant.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 mb-2 bg-card border rounded-lg cursor-move shadow-lg hover:shadow-xl transition-shadow duration-200 ${
                              snapshot.isDragging ? "shadow-2xl" : ""
                            }`}
                          >
                            <div className="font-medium text-sm">
                              {assistant.displayName.split(' ').slice(0, 2).join(' ')}
                            </div>
                            <Badge className={`text-xs mt-1 border ${getRoleBadgeStyle('Ajudante')}`}>Ajudante</Badge>
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
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Route className="w-5 h-5" />
                Formação de Rota
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routes.filter(r => r.status === "formation").map((route) => (
                  <div key={route.id} className="border rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow duration-200">
                    <div className="text-center">
                      {/* Data no topo */}
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mb-3">
                        <Calendar className="w-3 h-3" />
                        {route.startDate}
                      </p>
                      
                      {/* Cidades - Todas com mesmo formato, sem ícone */}
                      <div className="mb-3">
                        <h4 className="font-medium text-base">{getAllCitiesFormatted(route)}</h4>
                      </div>
                      
                      {/* Botões centralizados */}
                      <div className="flex justify-center gap-2 mb-3">
                        <Button
                          onClick={() => handleEditRoute(route)}
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleConfirmRoute(route)}
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:bg-blue-500 hover:text-white"
                          disabled={!route.team?.driver?.username || route.team.assistantUsers.length === 0}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => openRouteActionModal(route, 'delete')}
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
                            className={`min-h-[80px] p-2 rounded space-y-1 ${
                              snapshot.isDraggingOver ? "border-2 border-primary border-dashed bg-primary/5" : "border border-border"
                            }`}
                          >
                            {route.team?.driver && route.team.driver.username && route.team.driver.id && (
                              <Draggable key={`team-driver-${route.id}-${route.team.driver.id}`} draggableId={route.team.driver.id} index={0}>
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
                                    <Badge className={`text-xs border ${getRoleBadgeStyle('Motorista')}`}>Motorista</Badge>
                                  </div>
                                )}
                              </Draggable>
                            )}
                            
                            {route.team?.assistantUsers
                              .filter(assistant => assistant.id && assistant.id.trim() !== "")
                              .map((assistant, assistantIndex) => (
                              <Draggable key={`team-assistant-${route.id}-${assistant.id}-${assistantIndex}`} draggableId={assistant.id} index={assistantIndex + 1}>
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
                                    <Badge className={`text-xs border ${getRoleBadgeStyle('Ajudante')}`}>Ajudante</Badge>
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
                
                {routes.filter(r => r.status === "formation").length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Clique em "Criar Rota" para começar.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Motoristas Disponíveis - Coluna 3 */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Motoristas Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="available-drivers">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[300px] max-h-[400px] overflow-y-auto rounded-lg ${
                      snapshot.isDraggingOver ? "border-2 border-primary border-dashed bg-primary/5 p-2" : ""
                    }`}
                  >
                    {availableDrivers
                      .filter(driver => driver.id && driver.id.trim() !== "")
                      .map((driver, index) => (
                      <Draggable key={`available-driver-${driver.id}-${index}`} draggableId={driver.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 mb-2 bg-card border rounded-lg cursor-move shadow-lg hover:shadow-xl transition-shadow duration-200 ${
                              snapshot.isDragging ? "shadow-2xl" : ""
                            }`}
                          >
                            <div className="font-medium text-sm">
                              {driver.displayName.split(' ').slice(0, 2).join(' ')}
                            </div>
                            <Badge className={`text-xs mt-1 border ${getRoleBadgeStyle('Motorista')}`}>Motorista</Badge>
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
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Rotas em andamento
              </CardTitle>
              <Button
                onClick={() => setShowExportModal(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {routes.filter(r => r.status === "active").map((route) => (
                <div key={route.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{getAllCitiesFormatted(route)}</h4>
                      <p className="text-xs text-muted-foreground">
                        Início: {formatDateToBR(route.startDate)}
                      </p>
                    </div>
                    <Badge variant={route.vehicle ? "default" : "secondary"}>
                      {route.vehicle ? "OK" : "Pendente"}
                    </Badge>
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
                      <div className="flex items-center gap-1 mt-1">
                        <span>Veículo: {route.vehicle?.plate || "Não definido"}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mb-2">
                    <Button 
                      onClick={() => handleDefineVehicle(route)}
                      variant={route.vehicle ? "outline" : "default"}
                      size="sm"
                      className="flex-1"
                    >
                      <Car className="w-3 h-3 mr-1" />
                      {route.vehicle ? "Alterar Veículo" : "Definir Veículo"}
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => openRouteActionModal(route, 'finish')}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Finalizar Rota
                    </Button>
                    <Button 
                      onClick={() => openRouteActionModal(route, 'delete')}
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
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Rotas Finalizadas
              </CardTitle>
              <Button
                onClick={() => setShowFinishedExportModal(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getFinishedRoutesPage().map((route) => (
                <div key={route.id} className="border rounded-lg p-3 bg-muted/30">
                  <h4 className="font-medium">{getAllCitiesFormatted(route)}</h4>
                  
                  <p className="text-sm text-muted-foreground mt-2">
                    Início: {formatDateToBR(route.startDate)} - Finalizado: {formatDateToBR(route.endDate || route.startDate)}
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
                      <div>Veículo: {route.vehicle?.plate || "Não definido"}</div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <Badge variant="secondary">Finalizada</Badge>
                    <Button 
                      onClick={() => openRouteActionModal(route, 'delete')}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination for finished routes */}
            {getTotalFinishedPages() > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  onClick={() => setFinishedRoutesPage(prev => Math.max(0, prev - 1))}
                  variant="outline"
                  size="sm"
                  disabled={finishedRoutesPage === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {finishedRoutesPage + 1} de {getTotalFinishedPages()}
                </span>
                <Button
                  onClick={() => setFinishedRoutesPage(prev => Math.min(getTotalFinishedPages() - 1, prev + 1))}
                  variant="outline"
                  size="sm"
                  disabled={finishedRoutesPage >= getTotalFinishedPages() - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Ação da Rota */}
      <Dialog open={showRouteActionModal} onOpenChange={setShowRouteActionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmação de segurança</DialogTitle>
            <DialogDescription>
              Confirme a ação que deseja executar
            </DialogDescription>
          </DialogHeader>
          
          {selectedRoute && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <strong>Rota:</strong> {getAllCitiesFormatted(selectedRoute)}
              </div>
              
              <div className="space-y-2">
                {actionContext === 'finish' && (
                  <Button
                    onClick={() => handleActionChoice('finish')}
                    className="w-full flex items-center gap-2"
                    variant="default"
                  >
                    <Calendar className="w-4 h-4" />
                    Finalizar Rota
                  </Button>
                )}
                
                {actionContext === 'delete' && (
                  <Button
                    onClick={() => handleActionChoice('delete')}
                    className="w-full flex items-center gap-2"
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir Rota
                  </Button>
                )}
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
            <DialogDescription>
              Esta ação requer confirmação. Revise as informações antes de prosseguir.
            </DialogDescription>
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
                  <strong>Rota:</strong> {selectedRoute ? getAllCitiesFormatted(selectedRoute) : 'N/A'}<br/>
                  <strong>Data:</strong> {selectedRoute?.startDate}
                  {selectedRoute?.team && (
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

      {/* Modal de Exportação */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Exportar Rotas Ativas
            </DialogTitle>
            <DialogDescription>
              Escolha o formato de exportação dos dados das rotas ativas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Total de rotas ativas: {routes.filter(r => r.status === "active").length}
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={exportToXLSX}
                className="w-full flex items-center justify-center gap-2"
                variant="default"
                disabled={routes.filter(r => r.status === "active").length === 0}
              >
                <Download className="w-4 h-4" />
                Exportar como XLSX
              </Button>
              
              <Button
                onClick={exportToPDF}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
                disabled={routes.filter(r => r.status === "active").length === 0}
              >
                <Download className="w-4 h-4" />
                Exportar como PDF
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setShowExportModal(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Exportação para Rotas Finalizadas */}
      <Dialog open={showFinishedExportModal} onOpenChange={setShowFinishedExportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Exportar Rotas Finalizadas
            </DialogTitle>
            <DialogDescription>
              Escolha o formato e período para exportação
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Total de rotas finalizadas: {routes.filter(r => r.status === "completed").length}
            </div>
            
            {/* Date Range Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período (opcional)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Data Início</label>
                  <input
                    type="date"
                    value={exportDateRange.startDate}
                    onChange={(e) => setExportDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Data Fim</label>
                  <input
                    type="date"
                    value={exportDateRange.endDate}
                    onChange={(e) => setExportDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={exportFinishedToXLSX}
                className="w-full flex items-center justify-center gap-2"
                variant="default"
                disabled={routes.filter(r => r.status === "completed").length === 0}
              >
                <Download className="w-4 h-4" />
                Exportar como XLSX
              </Button>
              
              <Button
                onClick={exportFinishedToPDF}
                className="w-full flex items-center justify-center gap-2"
                variant="outline"
                disabled={routes.filter(r => r.status === "completed").length === 0}
              >
                <Download className="w-4 h-4" />
                Exportar como PDF
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setShowFinishedExportModal(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Seleção de Veículo */}
      <Dialog open={showVehicleModal} onOpenChange={setShowVehicleModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5" />
              Selecionar Veículo
            </DialogTitle>
            <DialogDescription>
              Escolha um veículo para a rota ou registre um novo
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Veículos Disponíveis</h3>
              <Button
                onClick={() => setShowNewVehicleModal(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                data-testid="button-new-vehicle"
              >
                <Plus className="w-4 h-4" />
                Registrar Novo
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {vehicles.filter(v => v.active).map((vehicle) => (
                <div 
                  key={vehicle.id}
                  className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleSelectVehicle(vehicle)}
                  data-testid={`card-vehicle-${vehicle.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-lg" data-testid={`text-vehicle-plate-${vehicle.id}`}>{vehicle.plate}</h4>
                      <p className="text-sm text-muted-foreground" data-testid={`text-vehicle-model-${vehicle.id}`}>{vehicle.model}</p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-vehicle-year-${vehicle.id}`}>Ano: {vehicle.year}</p>
                    </div>
                    <div className="text-2xl">
                      🚛
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {vehicles.filter(v => v.active).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum veículo cadastrado</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowVehicleModal(false);
                setSelectedRouteForVehicle(null);
              }}
              data-testid="button-cancel-vehicle-selection"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Registro de Novo Veículo */}
      <Dialog open={showNewVehicleModal} onOpenChange={setShowNewVehicleModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Registrar Novo Veículo
            </DialogTitle>
            <DialogDescription>
              Cadastre um novo veículo na frota
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Placa do Veículo *</label>
              <input
                type="text"
                value={newVehicleData.plate}
                onChange={(e) => setNewVehicleData(prev => ({ ...prev, plate: e.target.value }))}
                placeholder="Ex: ABC-1234"
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="input-vehicle-plate"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Modelo</label>
              <input
                type="text"
                value={newVehicleData.model}
                onChange={(e) => setNewVehicleData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="Ex: Mercedes-Benz Atego"
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="input-vehicle-model"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Ano</label>
              <input
                type="number"
                value={newVehicleData.year}
                onChange={(e) => setNewVehicleData(prev => ({ ...prev, year: e.target.value }))}
                placeholder={`Ex: ${new Date().getFullYear()}`}
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="input-vehicle-year"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewVehicleModal(false);
                setNewVehicleData({ plate: "", model: "", year: "" });
              }}
              data-testid="button-cancel-new-vehicle"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateVehicle}
              data-testid="button-register-vehicle"
            >
              Registrar Veículo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}