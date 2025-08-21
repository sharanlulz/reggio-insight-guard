import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { useEffect } from 'react';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect authenticated users to dashboard, others to landing
    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-reggio-primary"></div>
    </div>
  );
};

export default Index;
