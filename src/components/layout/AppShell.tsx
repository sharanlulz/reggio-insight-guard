import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  LayoutDashboard, 
  Scale, 
  Shield, 
  AlertTriangle, 
  CheckSquare, 
  FileText,
  Menu,
  X,
  Settings,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from 'next-themes';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Stress Testing', href: '/risk', icon: AlertTriangle },
  { name: 'Compliance', href: '/compliance', icon: Shield },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Regulation Test', href: '/pra-collection', icon: Monitor },
  { name: 'Operator Test', href: '/operator', icon: Monitor }
];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark': return <Moon className="h-4 w-4" />;
      case 'light': return <Sun className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground hover:text-reggio-primary transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-reggio-primary to-reggio-accent"></div>
            <span>Reggio</span>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Auth section */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 transform bg-sidebar border-r transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <nav className="flex h-full flex-col p-4">
          {/* Main Navigation */}
          <div className="flex-1 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                    ${active 
                      ? 'bg-gradient-to-r from-reggio-primary/10 to-reggio-accent/10 text-reggio-primary border-r-2 border-reggio-primary shadow-sm' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1'
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-reggio-primary' : ''}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Settings Section */}
          <div className="border-t border-sidebar-border pt-4 space-y-2">
            <div className="flex items-center gap-2 px-3 py-1 mb-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Settings</span>
            </div>
            
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              onClick={cycleTheme}
              className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
            >
              {getThemeIcon()}
              <span className="capitalize">{theme === 'system' ? 'Auto' : theme} Theme</span>
            </Button>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="pt-16 lg:pl-64">
        <div className="min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>
    </div>
  );
}
