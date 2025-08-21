import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  TrendingUp, 
  Clock, 
  Users, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { useSEO } from '@/hooks/use-seo';

const features = [
  {
    icon: Shield,
    title: 'Regulatory Intelligence',
    description: 'Stay ahead of regulatory changes with AI-powered analysis and real-time updates.',
  },
  {
    icon: TrendingUp,
    title: 'Financial Modeling',
    description: 'Comprehensive stress testing and capital adequacy calculations for informed decisions.',
  },
  {
    icon: Clock,
    title: 'Real-time Monitoring',
    description: 'Continuous compliance monitoring with automated alerts and risk assessments.',
  },
  {
    icon: Users,
    title: 'Board-ready Reports',
    description: 'Generate executive briefings and compliance reports with a single click.',
  },
];

const benefits = [
  'AI-driven regulatory change detection',
  'Automated compliance monitoring',
  'Real-time stress testing capabilities',
  'Executive dashboard and reporting',
  'Multi-jurisdiction support',
  'Integration with existing systems'
];

export default function Landing() {
  const { user } = useAuth();
  
  useSEO({ 
    title: "Reggio – AI-Driven Regulatory & Financial Intelligence Platform", 
    description: "Reggio helps financial institutions understand regulations, model financial impact, and stay ahead of regulatory changes with real-time intelligence." 
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-reggio-primary to-reggio-accent"></div>
            <span>Reggio</span>
          </Link>
          
          {user ? (
            <Button asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
            Your AI-Driven{' '}
            <span className="bg-gradient-to-r from-reggio-primary to-reggio-accent bg-clip-text text-transparent">
              Regulatory & Financial
            </span>{' '}
            Intelligence Platform
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Reggio helps financial institutions understand regulations, model financial impact, 
            and stay ahead of regulatory changes with real-time intelligence and automated compliance monitoring.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-reggio-primary hover:bg-reggio-primary-hover">
              <Link to="/login">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Comprehensive Regulatory Intelligence</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage regulatory compliance and financial risk in one platform.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-0 shadow-lg">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-reggio-primary/10">
                      <Icon className="h-6 w-6 text-reggio-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Stay Compliant, Stay Competitive
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                With Reggio's AI-powered platform, transform regulatory compliance from a cost center 
                into a strategic advantage. Our real-time intelligence helps you anticipate changes, 
                optimize capital allocation, and make informed decisions faster than ever.
              </p>
              
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-reggio-success flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-reggio-primary/10 to-reggio-accent/10 rounded-2xl p-8">
              <div className="aspect-video bg-background rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Interactive Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-reggio-primary to-reggio-accent py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-2xl text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Regulatory Intelligence?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join forward-thinking financial institutions using Reggio to stay ahead of regulatory changes.
            </p>
            
            <Button size="lg" variant="secondary" asChild className="bg-white text-reggio-primary hover:bg-gray-100">
              <Link to="/login">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 font-bold text-lg mb-4">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-reggio-primary to-reggio-accent"></div>
            <span>Reggio</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Reggio. Regulatory intelligence for the modern financial institution.
          </p>
        </div>
      </footer>
    </div>
  );
}