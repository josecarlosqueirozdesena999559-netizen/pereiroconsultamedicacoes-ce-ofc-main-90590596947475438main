import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MedicacoesAutoCusto from "./pages/MedicacoesAutoCusto";
import ConsultaSUS from "./pages/ConsultaSUS";
import NotFound from "./pages/NotFound";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { AuthProvider } from "./hooks/useAuth";
import { ChatWidget } from "./components/ChatWidget";

// Wrapper para ocultar ChatWidget no Dashboard
const ChatWidgetWrapper = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  
  if (isDashboard) return null;
  return <ChatWidget />;
};


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/medicacoes-auto-custo" element={<MedicacoesAutoCusto />} />
            <Route path="/consulta-sus" element={<ConsultaSUS />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <PWAInstallPrompt />
          <ChatWidgetWrapper />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;