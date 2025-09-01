import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StorageProvider } from "./context/StorageContext";
import { ApiStorageAdapter } from "./storage/apiAdapter";
import { AuthService } from "./auth/service";
import { User, AppRoute } from "./config/types";
import { CONFIG } from "./config/constants";
import { Menu, X, Eye } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Pages
import { LoginPage } from "./pages/LoginPage";
import { SelectPartnerPage } from "./pages/SelectPartnerPage";
import { ChecklistPage } from "./pages/ChecklistPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminPage } from "./pages/AdminPage";
import { TeamBuilderPage } from "./pages/TeamBuilderPage.tsx";
import NotFound from "@/pages/not-found";

// Create storage adapter instance
const storageAdapter = new ApiStorageAdapter();

function AppContent() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  const authService = new AuthService(storageAdapter);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('App initialization started...');
      setLoading(true);
      
      // Check for remembered session
      await authService.ensureFirstLogin();
      
      // Check current user
      const user = await authService.getCurrentUser();
      console.log('initializeApp: Current user:', user ? `${user.displayName} (${user.role})` : 'none');
      
      if (user) {
        setCurrentUser(user);
        const initialRoute = user.role === "admin" ? "dashboard" : "selectPartner";
        console.log('initializeApp: Setting initial route to:', initialRoute);
        setCurrentRoute(initialRoute);
      } else {
        console.log('initializeApp: No user found, showing login');
        setCurrentRoute("login");
      }
    } catch (error) {
      console.error("App initialization error:", error);
      // On error, show login page
      setCurrentRoute("login");
      setCurrentUser(null);
    } finally {
      setLoading(false);
      console.log('App initialization completed');
    }
  };

  const handleLoggedIn = async () => {
    try {
      console.log('Starting handleLoggedIn flow...');
      
      const user = await authService.getCurrentUser();
      console.log('Current user after login:', user);
      
      if (user) {
        console.log('Setting current user:', user);
        setCurrentUser(user);
        
        // Determine next route
        const nextRoute = user.role === "admin" ? "dashboard" : "selectPartner";
        console.log('Determined next route:', nextRoute);
        
        // Update route state immediately without setTimeout to avoid timing issues
        setCurrentRoute(nextRoute);
        console.log('Route set to:', nextRoute);
      } else {
        console.error('No user found after login - redirecting to login');
        setCurrentUser(null);
        setCurrentRoute("login");
      }
    } catch (error) {
      console.error('Error in handleLoggedIn:', error);
      setCurrentUser(null);
      setCurrentRoute("login");
    }
  };

  const handlePartnerSelected = async (username: string) => {
    const users = await storageAdapter.getUsers();
    const partner = users.find(u => u.username === username);
    if (partner) {
      setSelectedPartner(partner);
      setCurrentRoute("checklist");
    }
  };

  const handleEvaluationSaved = () => {
    setSelectedPartner(null);
    setCurrentRoute("selectPartner");
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setSelectedPartner(null);
    setCurrentRoute("login");
  };

  const navigateTo = (route: AppRoute) => {
    console.log('Navigating to route:', route);
    // Forçar atualização do estado para garantir que a rota seja alterada
    setCurrentRoute(route);
    setCurrentRoute(route);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full border-2 border-gray-300 border-t-transparent animate-spin mx-auto mb-2" />
          <div className="text-sm text-gray-600">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      {currentUser && (
  <header className="bg-card border-b border-gray-300 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-auto px-2 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-colors ${
                    navigator.onLine ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    <span>OURO VERDE</span>
                  </div>
                  <div>
                    <h1 className="text-sm sm:text-lg font-semibold text-foreground">
                      Acompanhamento Diário
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Versão {CONFIG.version}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Desktop Menu */}
              <div className="hidden lg:flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {currentUser.displayName.split(' ').slice(0, 2).join(' ')}
                </span>
                
                {currentUser.role === "admin" && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigateTo("dashboard")}
                      className={`px-3 py-1 text-sm rounded-md ${
                        currentRoute === "dashboard" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                      data-testid="nav-dashboard"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => navigateTo("teamBuilder")}
                      className={`px-3 py-1 text-sm rounded-md ${
                        currentRoute === "teamBuilder" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                      data-testid="nav-team-builder"
                    >
                      Montar Equipes
                    </button>
                    <button
                      onClick={() => navigateTo("admin")}
                      className={`px-3 py-1 text-sm rounded-md ${
                        currentRoute === "admin" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                      data-testid="nav-admin"
                    >
                      Gestão de Usuários
                    </button>
                  </div>
                )}
                
                {currentUser.role === "colaborador" && currentRoute !== "selectPartner" && (
                  <button
                    onClick={() => navigateTo("selectPartner")}
                    className="px-3 py-1 text-sm rounded-md hover:bg-muted"
                    data-testid="nav-back"
                  >
                    Voltar
                  </button>
                )}
                
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm rounded-md hover:bg-muted text-destructive"
                  data-testid="button-logout"
                >
                  Sair
                </button>
              </div>

              {/* Mobile Menu Button */}
              <div className="lg:hidden flex items-center gap-2">
                {currentUser.role === "colaborador" && (
                  <button
                    onClick={() => setAccessibilityMode(!accessibilityMode)}
                    className={`p-2 rounded-md transition-colors ${
                      accessibilityMode ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'hover:bg-muted'
                    }`}
                    data-testid="mobile-accessibility-button"
                    title="Modo de Acessibilidade"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md hover:bg-muted"
                  data-testid="mobile-menu-toggle"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
              <div className="lg:hidden border-t border-gray-300 bg-card">
                <div className="px-4 py-3 space-y-2">
                  <div className="text-sm text-muted-foreground pb-2 border-b border-gray-300">
                    {currentUser.displayName.split(' ').slice(0, 2).join(' ')}
                  </div>
                  
                  {currentUser.role === "admin" && (
                    <>
                      <button
                        onClick={() => {
                          navigateTo("dashboard");
                          setIsMobileMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-sm rounded-md ${
                          currentRoute === "dashboard" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                        data-testid="mobile-nav-dashboard"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={() => {
                          navigateTo("teamBuilder");
                          setIsMobileMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-sm rounded-md ${
                          currentRoute === "teamBuilder" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                        data-testid="mobile-nav-team-builder"
                      >
                        Montar Equipes
                      </button>
                      <button
                        onClick={() => {
                          navigateTo("admin");
                          setIsMobileMenuOpen(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-sm rounded-md ${
                          currentRoute === "admin" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                        data-testid="mobile-nav-admin"
                      >
                        Gestão
                      </button>
                    </>
                  )}
                  
                  {currentUser.role === "colaborador" && currentRoute !== "selectPartner" && (
                    <button
                      onClick={() => {
                        navigateTo("selectPartner");
                        setIsMobileMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted"
                      data-testid="mobile-nav-back"
                    >
                      Voltar
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted text-destructive"
                    data-testid="mobile-button-logout"
                  >
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-auto">
        {(() => { 
          console.log('Rendering route:', currentRoute, 'User:', currentUser?.role, 'Loading:', loading);
          return null;
        })()}
        
        {currentRoute === "login" && (
          <LoginPage onLoggedIn={handleLoggedIn} />
        )}
        
        {currentRoute === "selectPartner" && currentUser && (
          <SelectPartnerPage 
            currentUser={currentUser} 
            onSelected={handlePartnerSelected}
            accessibilityMode={accessibilityMode}
          />
        )}
        
        {currentRoute === "checklist" && currentUser && selectedPartner && (
          <ChecklistPage
            currentUser={currentUser}
            evaluatedUser={selectedPartner}
            onSaved={handleEvaluationSaved}
            accessibilityMode={accessibilityMode}
          />
        )}
        
        {currentRoute === "dashboard" && currentUser && (
          <DashboardPage />
        )}
        
        {currentRoute === "teamBuilder" && currentUser && (
          <TeamBuilderPage />
        )}
        
        {currentRoute === "admin" && currentUser && (
          <AdminPage />
        )}
        
        {/* Fallback content for debugging - shows when no route matches */}
        {!["login", "selectPartner", "checklist", "dashboard", "teamBuilder", "admin"].includes(currentRoute) && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="text-lg font-semibold text-gray-900 mb-2">Estado da Aplicação</div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Rota atual: {currentRoute}</div>
                <div>Usuário: {currentUser ? `${currentUser.displayName} (${currentUser.role})` : 'Nenhum'}</div>
                <div>Carregando: {loading ? 'Sim' : 'Não'}</div>
              </div>
              <button 
                onClick={() => setCurrentRoute("login")} 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Ir para Login
              </button>
            </div>
          </div>
        )}
      </main>
      
      <footer className="border-t bg-muted/30 py-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Acompanhamento Diário © 2025. Criado por Jucélio Verissimo.
        </div>
      </footer>
      
      <Toaster />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AppContent} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <StorageProvider adapter={storageAdapter}>
            <Router />
          </StorageProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
