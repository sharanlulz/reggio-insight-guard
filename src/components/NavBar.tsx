import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NavBar = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <nav className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-semibold">Reggio</Link>
          <Link to="/dashboard" className={isActive("/dashboard") ? "text-primary" : "text-muted-foreground"}>Dashboard</Link>
          <Link to="/clauses" className={isActive("/clauses") ? "text-primary" : "text-muted-foreground"}>Clauses</Link>
          <Link to="/brief" className={isActive("/brief") ? "text-primary" : "text-muted-foreground"}>Board Brief</Link> 
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button onClick={logout} variant="secondary">Sign out</Button>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
