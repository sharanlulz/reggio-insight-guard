import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
      <header className="p-4 border-b flex items-center justify-between">
        <Link to="/" className="font-semibold">Reggio</Link>
        <nav className="text-sm flex gap-3">
          <Link to="/regs" className="underline">Regs</Link>
          <Link to="/debug" className="underline">Debug</Link>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
