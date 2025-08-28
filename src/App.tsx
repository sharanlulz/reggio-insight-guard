// src/App.tsx
import React, { Suspense, lazy } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthProvider";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";

// ---- Lazy-loaded pages (code-splitting) ----
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clauses = lazy(() => import("./pages/Clauses"));
const BoardBrief = lazy(() => import("./pages/BoardBrief"));
const Debug = lazy(() => import("./pages/Debug"));
const RegulatoryIntelligence = lazy(() => import("./pages/RegulatoryIntelligence"));
const StressTestDashboard = lazy(() => import("./pages/StressTestDashboard"));
const MonitorControl = lazy(() => import("./pages/MonitorControl"));
const OperatorDashboard = lazy(() => import("./pages/OperatorDashboard"));
const OperatorIngestions = lazy(() => import("./pages/operator/operator-ingestions"));
const OperatorVersions = lazy(() => import("./pages/operator/operator-versions"));
const Regs = lazy(() => import("./pages/Regs"));
const PRACollection = lazy(() => import("./pages/PRACollection"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ---- Suspense fallback ----
function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="animate-pulse text-sm opacity-70">Loading…</div>
    </div>
  );
}

const queryClient = new QueryClient();

export default function App() {
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
          <Suspense fallback={<PageFallback />}>
            <HashRouter>
              <AuthProvider>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth" element={<Auth />} />

                  {/* Protected app routes (keep requireAuth as in your current logic) */}
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute requireAuth={false}>
                        <AppShell>
                          <Suspense fallback={<PageFallback />}>
                            <Routes>
                              <Route path="/dashboard" element={<Dashboard />} />
                              <Route path="/clauses" element={<Clauses />} />
                              <Route path="/brief" element={<BoardBrief />} />
                              <Route path="/regs" element={<Regs />} />
                              <Route path="/regulations" element={<Regs />} />
                              <Route path="/pra-collection" element={<PRACollection />} />
                              <Route path="/risk" element={<StressTestDashboard />} />
                              <Route path="/stress-test" element={<StressTestDashboard />} />
                              <Route path="/stress-tests" element={<StressTestDashboard />} />
                              <Route path="/compliance" element={<RegulatoryIntelligence />} />
                              <Route path="/regulatory-intelligence" element={<RegulatoryIntelligence />} />
                              <Route path="/intelligence" element={<RegulatoryIntelligence />} />
                              <Route path="/monitor" element={<MonitorControl />} />
                              <Route path="/monitor-control" element={<MonitorControl />} />
                              <Route path="/reports" element={<BoardBrief />} />
                              <Route path="/operator" element={<OperatorDashboard />} />
                              <Route path="/operator/ingestions" element={<OperatorIngestions />} />
                              <Route path="/operator-ingestions" element={<OperatorIngestions />} />
                              <Route path="/operator/versions" element={<OperatorVersions />} />
                              <Route path="/operator-versions" element={<OperatorVersions />} />
                              <Route path="/debug" element={<Debug />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </AppShell>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </AuthProvider>
            </HashRouter>
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
