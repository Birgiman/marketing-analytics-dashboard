import { AccountSettingsModal } from './AccountSettingsModal';

interface SalesHeaderProps {
  title: string;
  salesTarget?: string;
  salesPercentage?: string;
  location?: string;
}

export const SalesHeader = ({ 
  title, 
  salesTarget = "R$ 1,10M / 10M", 
  salesPercentage = "11%"
}: SalesHeaderProps) => {
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
        
        <AccountSettingsModal />
      </div>
    </header>
  );
};