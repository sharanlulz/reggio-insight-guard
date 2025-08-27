import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from '@/context/AuthProvider';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/ThemeProvider';
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Clauses from "./pages/Clauses";
import BoardBrief from "./pages/BoardBrief";
import Debug from "./pages/Debug";
import RegulatoryIntelligence from "./pages/RegulatoryIntelligence";
import StressTestDashboard from "./pages/StressTestDashboard";
import MonitorControl from "./pages/MonitorControl";
import OperatorDashboard from "./pages/OperatorDashboard";
import OperatorIngestions from "./pages/operator/operator-ingestions";
import OperatorVersions from "./pages/operator/operator-versions";
import NotFound from "./pages/NotFound";
import Regs from "./pages/Regs";
import PRACollectionDashboard from './pages/PRACollection';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth" element={<Auth />} />
                
                {/* Protected app routes */}
                <Route path="/*" element={
                  <ProtectedRoute requireAuth={false}>
                    <AppShell>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/clauses" element={<Clauses />} />
                        <Route path="/brief" element={<BoardBrief />} />
                        <Route path="/regs" element={<Regs />} />
                        <Route path="/pra-collection" element={<PRACollectionDashboard />} />
                        <Route path="/regulations" element={<Regs />} />
                        <Route path="/risk" element={<StressTestDashboard />} />
                        <Route path="/compliance" element={<RegulatoryIntelligence />} />
                        <Route path="/tasks" element={<MonitorControl />} />
                        <Route path="/reports" element={<BoardBrief />} />
                        <Route path="/stress-test" element={<StressTestDashboard />} />
                        <Route path="/stress-tests" element={<StressTestDashboard />} />
                        <Route path="/regulatory-intelligence" element={<RegulatoryIntelligence />} />
                        <Route path="/intelligence" element={<RegulatoryIntelligence />} />
                        <Route path="/monitor-control" element={<MonitorControl />} />
                        <Route path="/monitor" element={<MonitorControl />} />
                        <Route path="/operator" element={<OperatorDashboard />} />
                        <Route path="/operator/ingestions" element={<OperatorIngestions />} />
                        <Route path="/operator-ingestions" element={<OperatorIngestions />} />
                        <Route path="/operator/versions" element={<OperatorVersions />} />
                        <Route path="/operator-versions" element={<OperatorVersions />} />
                        <Route path="/debug" element={<Debug />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AppShell>
                  </ProtectedRoute>
                } />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
