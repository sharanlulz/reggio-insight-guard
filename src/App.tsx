import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clauses from "./pages/Clauses";
import BoardBrief from "./pages/BoardBrief";
import Debug from "@/pages/Debug";
import Regs from "@/pages/Regs";
import OperatorDashboard from "@/pages/OperatorDashboard";
import OperatorVersions from "@/pages/operator/operator-versions";
import OperatorIngestions from "@/pages/operator/operator-ingestions";
import StressTestDashboard from "@/pages/StressTestDashboard";

// ✅ NEW REGULATORY INTELLIGENCE IMPORTS
import MonitorControl from "@/pages/MonitorControl";
import RegulatoryIntelligence from "@/pages/RegulatoryIntelligence";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <header className="p-4 border-b flex items-center justify-between">
        <Link to="/" className="font-semibold text-xl">Reggio</Link>
        <nav className="text-sm flex gap-3">
          {/* Core Navigation */}
          <Link to="/dashboard" className="underline hover:text-blue-600">Dashboard</Link>
          <Link to="/regs" className="underline hover:text-blue-600">Regs</Link>
          
          {/* ✅ NEW REGULATORY INTELLIGENCE NAVIGATION */}
          <Link to="/monitor" className="underline hover:text-blue-600">Monitor</Link>
          <Link to="/intelligence" className="underline hover:text-blue-600">Intelligence</Link>
          <Link to="/stress-tests" className="underline hover:text-blue-600">Stress Tests</Link>
          
          {/* Operator & Debug */}
          <Link to="/operator" className="underline hover:text-gray-600">Operator</Link>
          <Link to="/debug" className="underline hover:text-gray-600">Debug</Link>
        </nav>
      </header>
      
      <Routes>
        {/* Core Pages */}
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clauses" element={<Clauses />} />
        <Route path="/brief" element={<BoardBrief />} />
        <Route path="/regs" element={<Regs />} />
        <Route path="/debug" element={<Debug />} />
        
        {/* ✅ NEW REGULATORY INTELLIGENCE PAGES */}
        <Route path="/monitor" element={<MonitorControl />} />
        <Route path="/intelligence" element={<RegulatoryIntelligence />} />
        <Route path="/stress-tests" element={<StressTestDashboard />} />
        
        {/* Operator pages */}
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/operator-versions" element={<OperatorVersions />} />
        <Route path="/operator-ingestions" element={<OperatorIngestions />} />
        
        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
