import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StorageProvider } from "./context/StorageContext";
import { LocalStorageAdapter } from "./storage/localStorage";
import { AuthService } from "./auth/service";
import { seedUsers } from "./storage/seeds";
import { User, AppRoute } from "./config/types";
import { CONFIG } from "./config/constants";
import { Menu, X } from "lucide-react";

// Pages
import { LoginPage } from "./pages/LoginPage";
import { SelectPartnerPage } from "./pages/SelectPartnerPage";
import { ChecklistPage } from "./pages/ChecklistPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminPage } from "./pages/AdminPage";
import { TeamBuilderPage } from "./pages/TeamBuilderPage.tsx";
import NotFound from "@/pages/not-found";

// Create storage adapter instance
const storageAdapter = new LocalStorageAdapter();

function AppContent() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const authService = new AuthService(storageAdapter);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Seed initial data
      await seedUsers(storageAdapter);
      
      // Check for remembered session
      await authService.ensureFirstLogin();
      
      // Check current user
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setCurrentRoute(user.role === "admin" ? "dashboard" : "selectPartner");
      }
    } catch (error) {
      console.error("App initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoggedIn = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setCurrentRoute(user.role === "admin" ? "dashboard" : "selectPartner");
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      {currentUser && (
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-auto px-2 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-colors ${
                    navigator.onLine ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    <span>OURO VERDE</span>
                  </div>
                  <h1 className="text-sm sm:text-lg font-semibold text-foreground">
                    Sistema de Acompanhamento Diário
                  </h1>
                </div>
              </div>
              
              {/* Desktop Menu */}
              <div className="hidden lg:flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {currentUser.displayName}
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
                      Gestão
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
              <div className="lg:hidden">
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
              <div className="lg:hidden border-t border-border bg-card">
                <div className="px-4 py-3 space-y-2">
                  <div className="text-sm text-muted-foreground pb-2 border-b border-border">
                    {currentUser.displayName}
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
      <main className="flex-1 flex flex-col">
        {currentRoute === "login" && (
          <LoginPage onLoggedIn={handleLoggedIn} />
        )}
        
        {currentRoute === "selectPartner" && currentUser && (
          <SelectPartnerPage 
            currentUser={currentUser} 
            onSelected={handlePartnerSelected} 
          />
        )}
        
        {currentRoute === "checklist" && currentUser && selectedPartner && (
          <ChecklistPage
            currentUser={currentUser}
            evaluatedUser={selectedPartner}
            onSaved={handleEvaluationSaved}
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
      </main>
      
      <footer className="border-t bg-muted/30 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Sistema de Acompanhamento Diário © 2025. Criado por Jucélio Verissimo.
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StorageProvider adapter={storageAdapter}>
          <Router />
        </StorageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
