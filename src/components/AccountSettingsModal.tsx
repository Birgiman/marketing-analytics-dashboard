import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const AccountSettingsModal = () => {
  const navigate = useNavigate();

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="gap-2"
      onClick={() => navigate('/profile')}
    >
      <Settings className="h-4 w-4" />
      Configurações
    </Button>
  );
};