import { useEffect, useState } from "react";
import { Layout } from "./components/layout/Layout";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { DocsView } from "./components/docs/DocsView";
import { analytics } from "./lib/firebase";

function App() {
  const [currentView, setCurrentView] = useState("Dashboard");

  useEffect(() => {
    // Analytics jest zainicjalizowany
    if (analytics) {
      console.log('Firebase Analytics podłączony i gotowy do zbierania danych z SuperBRAIN!')
    }
  }, []);

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {currentView === "Dashboard" && <DashboardOverview />}
      {currentView === "Docs" && <DocsView />}
    </Layout>
  );
}

export default App;
