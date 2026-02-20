import { useEffect } from "react";
import { Layout } from "./components/layout/Layout";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { analytics } from "./lib/firebase";

function App() {
  useEffect(() => {
    // Analytics jest zainicjalizowany
    if (analytics) {
      console.log('Firebase Analytics podłączony i gotowy do zbierania danych z SuperBRAIN!')
    }
  }, []);

  return (
    <Layout>
      <DashboardOverview />
    </Layout>
  );
}

export default App;
