import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// IMPORTS DO AVISO DE ATUALIZAÇÃO
import { AnnouncementProvider } from "@/announcement/AnnouncementProvider";
import AnnouncementBar from "@/announcement/AnnouncementBar";
import { useAuth } from "@/hooks/useAuth";

// --- WRAPPER PARA ENVOLVER O APP ---
function RootWrapper() {
  // Define o papel do usuário (admin ou useradmin)
  let role: "admin" | "useradmin" = "useradmin";

  try {
    // Tenta usar o hook se ele existir
    const { user } = useAuth();
    if (user?.tipo === "admin") role = "admin";
  } catch {
    // ignora se o hook não existir ainda
  }

  return (
    <AnnouncementProvider role={role}>
      <AnnouncementBar />
      <App />
    </AnnouncementProvider>
  );
}

// --- RELOAD AUTOMÁTICO SE SW FOR ATUALIZADO ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("[SW] Novo service worker ativo, recarregando página...");
    window.location.reload();
  });
}

// --- RENDERIZA O APP ---
createRoot(document.getElementById("root")!).render(<RootWrapper />);
