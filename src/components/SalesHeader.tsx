import { useState } from 'react';
import { MapPin, Settings } from 'lucide-react';
import { AccountSettingsModal } from './AccountSettingsModal';

interface SalesHeaderProps {
  title: string;
  salesTarget?: string;
  salesPercentage?: string;
  location?: string;
}

export const SalesHeader = ({ 
  title, 
  salesTarget = "R$ 110M / 10M", 
  salesPercentage = "11%",
  location = "Endereço"
}: SalesHeaderProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  return (
    <header className="flex items-center justify-between p-6 bg-card border-b border-border">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-muted-foreground">{salesTarget}</span>
          <span className="w-2 h-2 bg-primary rounded-full"></span>
          <span className="text-muted-foreground">{salesPercentage}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>
        
        <Settings 
          className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" 
          onClick={() => setIsSettingsOpen(true)}
        />
      </div>
      
      <AccountSettingsModal 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
      />
    </header>
  );
};