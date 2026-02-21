import { useEffect, useState } from "react";
import { Layout } from "./components/layout/Layout";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { DocsView } from "./components/docs/DocsView";
import { TagsView } from "./components/docs/TagsView";
import { analytics } from "./lib/firebase";

function App() {
  const [currentView, setCurrentView] = useState("Dashboard");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    if (analytics) {
      console.log('Firebase Analytics podłączony i gotowy do zbierania danych z SuperBRAIN!')
    }
  }, []);

  const handleNavigateToDocsWithTag = (tag: string) => {
    setActiveTag(tag);
    setCurrentView("Docs");
  };

  // Clear tag filter when navigating away from Docs
  const handleSetCurrentView = (view: string) => {
    if (view !== "Docs") setActiveTag(null);
    setCurrentView(view);
  };

  return (
    <Layout currentView={currentView} setCurrentView={handleSetCurrentView}>
      {currentView === "Dashboard" && <DashboardOverview />}
      {currentView === "Docs" && (
        <DocsView
          initialTag={activeTag ?? undefined}
          onTagFilterCleared={() => setActiveTag(null)}
        />
      )}
      {currentView === "Tagi" && (
        <TagsView onNavigateToDocsWithTag={handleNavigateToDocsWithTag} />
      )}
    </Layout>
  );
}

export default App;
