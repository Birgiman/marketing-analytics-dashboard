import { DEMO_MODE } from '@/lib/demo-mode';
import { AlertCircle } from 'lucide-react';

export const DemoBanner = () => {
  if (!DEMO_MODE) return null;

  return (
    <div className="bg-orange-100 border-b border-orange-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-10">
          <div className="flex items-center space-x-2 text-orange-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              MODO DEMO - Interface de demonstração (dados simulados)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};