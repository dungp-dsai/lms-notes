import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";
import { NotesPage } from "@/pages/NotesPage";
import { TaskPage } from "@/pages/TaskPage";
import { TaskHistoryPage } from "@/pages/TaskHistoryPage";
import { ToastContainer } from "@/components/ui/toast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const API_URL = import.meta.env.VITE_API_URL || "";
const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes

function useKeepAlive() {
  useEffect(() => {
    const pingBackend = () => {
      fetch(`${API_URL}/api/health`).catch(() => {});
    };

    pingBackend();
    const interval = setInterval(pingBackend, KEEP_ALIVE_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}

function App() {
  useKeepAlive();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:noteId" element={<NotesPage />} />
          <Route path="/task/:taskId" element={<TaskPage />} />
          <Route path="/tasks/history" element={<TaskHistoryPage />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </QueryClientProvider>
  );
}

export default App;
