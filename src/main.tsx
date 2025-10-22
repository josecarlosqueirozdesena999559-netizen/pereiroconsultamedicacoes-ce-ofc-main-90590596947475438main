import { AnnouncementProvider } from "@/announcement/AnnouncementProvider";
import AnnouncementBar from "@/announcement/AnnouncementBar";
import { useAuth } from "@/hooks/useAuth";
import Router from "./Router"; // ou suas rotas/componentes principais

function App() {
  const { user } = useAuth();
  const role = user?.tipo === "admin" ? "admin" : "useradmin";

  return (
    <AnnouncementProvider role={role}>
      <AnnouncementBar />
      <Router /> {/* ou o resto do seu app */}
    </AnnouncementProvider>
  );
}

export default App;
