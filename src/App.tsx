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
import StressTestDashboard from "@/pages/StressTestDashboard"; // ✅ NEW import

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <header className="p-4 border-b flex items-center justify-between">
        <Link to="/" className="font-semibold">Reggio</Link>
        <nav className="text-sm flex gap-3">
          <Link to="/regs" className="underline">Regs</Link>
          <Link to="/debug" className="underline">Debug</Link>
          <Link to="/operator" className="underline">Operator</Link>
          <Link to="/operator-versions" className="underline">Versions</Link>
          <Link to="/stress-tests" className="underline">Stress Tests</Link> {/* ✅ Nav link */}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clauses" element={<Clauses />} />
        <Route path="/brief" element={<BoardBrief />} />
        <Route path="/regs" element={<Regs />} />
        <Route path="/debug" element={<Debug />} />

        {/* Operator pages */}
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/operator-versions" element={<OperatorVersions />} />
        <Route path="/operator-ingestions" element={<OperatorIngestions />} />

        {/* Stress Test page */}
        <Route path="/stress-tests" element={<StressTestDashboard />} /> {/* ✅ New route */}

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
