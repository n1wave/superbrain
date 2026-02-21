import { useEffect, useState, useRef } from "react";
import { Layout } from "./components/layout/Layout";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { DocsView } from "./components/docs/DocsView";
import type { DocumentEditorHandle } from "./components/docs/DocumentEditor";
import { TagsView } from "./components/docs/TagsView";
import { TeamView } from "./components/team/TeamView";
import { analytics } from "./lib/firebase";
import { AlertCircle } from "lucide-react";

function App() {
  const [currentView, setCurrentView] = useState("Dashboard");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const editorRef = useRef<DocumentEditorHandle | null>(null);

  // Used to tell DocsView to close the editor when clicking "Docs" again in the sidebar
  const [forceResetDocs, setForceResetDocs] = useState(0);

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
    // If we're already on target view, do nothing Except Docs reset
    if (view === currentView) {
      if (view === "Docs") {
        if (hasUnsavedChanges) {
          setPendingNavigation(view); // Triggers the modal if they click "Docs" while editing a document
          return;
        }
        // If we are on Docs but not editing a document with changes, just reset view
        setForceResetDocs(prev => prev + 1);
      }
      return;
    }

    if (hasUnsavedChanges) {
      setPendingNavigation(view);
      return;
    }

    executeNavigation(view);
  };

  const executeNavigation = (view: string) => {
    if (view === "Docs") {
      setForceResetDocs(prev => prev + 1);
    } else {
      setActiveTag(null);
    }
    setCurrentView(view);
    setPendingNavigation(null);
    setHasUnsavedChanges(false); // Reset just in case
  };

  const handleSaveAndNavigate = async () => {
    if (pendingNavigation && editorRef.current) {
      const saved = await editorRef.current.save();
      if (saved) {
        executeNavigation(pendingNavigation);
      }
    }
  };

  return (
    <Layout currentView={currentView} setCurrentView={handleSetCurrentView}>
      {currentView === "Dashboard" && <DashboardOverview />}
      {currentView === "Docs" && (
        <DocsView
          initialTag={activeTag ?? undefined}
          onTagFilterCleared={() => setActiveTag(null)}
          onUnsavedChanges={setHasUnsavedChanges}
          forceResetTrigger={forceResetDocs}
          editorRef={editorRef}
        />
      )}
      {currentView === "Tagi" && (
        <TagsView onNavigateToDocsWithTag={handleNavigateToDocsWithTag} />
      )}
      {currentView === "Team" && <TeamView />}

      {/* Unsaved Changes Warning Modal */}
      {pendingNavigation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-midnight/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4 text-amber-600">
                <div className="p-3 bg-amber-50 rounded-full">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-brand-midnight">Niezapisane zmiany</h3>
              </div>
              <p className="text-brand-navy/80 mb-6">
                Masz niezapisane zmiany w aktualnym dokumencie. Jeśli wyjdziesz z edytora bez zapisu, zmiany zostaną utracone. Czy na pewno chcesz opuścić edytor?
              </p>
              <div className="flex justify-end gap-3 flex-wrap">
                <button
                  onClick={() => setPendingNavigation(null)}
                  className="px-4 py-2 text-sm font-medium text-brand-navy hover:text-brand-midnight bg-brand-sea/5 hover:bg-brand-sea/10 border border-brand-sea/10 transition-colors rounded-lg"
                >
                  Dokończ edycję
                </button>
                <button
                  onClick={() => executeNavigation(pendingNavigation)}
                  className="px-4 py-2 text-sm font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors rounded-lg"
                >
                  Porzuć zmiany
                </button>
                <button
                  onClick={handleSaveAndNavigate}
                  className="px-4 py-2 text-sm font-bold text-white bg-brand-sea hover:bg-brand-sea/90 transition-colors rounded-lg shadow-sm"
                >
                  Zapisz i kontynuuj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
