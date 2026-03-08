import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ServerSettingsProvider } from "@/contexts/ServerSettingsContext";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireSetup } from "@/components/RequireSetup";
import { RedirectIfAuth } from "@/components/RedirectIfAuth";
import { RedirectIfSetupComplete } from "@/components/RedirectIfSetupComplete";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Installer from "./pages/Installer";
import Setup from "./pages/Setup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ServerSettingsProvider>
            <Routes>
              <Route path="/install" element={<Installer />} />
              <Route
                path="/login"
                element={
                  <RedirectIfAuth>
                    <Login />
                  </RedirectIfAuth>
                }
              />
              <Route
                path="/setup"
                element={
                  <RequireAuth>
                    <RedirectIfSetupComplete>
                      <Setup />
                    </RedirectIfSetupComplete>
                  </RequireAuth>
                }
              />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <RequireSetup>
                      <Index />
                    </RequireSetup>
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ServerSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
