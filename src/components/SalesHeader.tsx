import { useState, useEffect } from 'react';
import { MapPin, Settings } from 'lucide-react';
import { AccountSettingsModal } from './AccountSettingsModal';
import { AddressModal } from './AddressModal';
import { supabase } from '@/integrations/supabase/client';

interface SalesHeaderProps {
  title: string;
  salesTarget?: string;
  salesPercentage?: string;
  location?: string;
}

export const SalesHeader = ({ 
  title, 
  salesTarget = "R$ 1,10M / 10M", 
  salesPercentage = "11%",
  location = "Endereço"
}: SalesHeaderProps) => {
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [userAddress, setUserAddress] = useState<{street: string; number: string} | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('address, city, state')
          .eq('user_id', session.user.id)
          .single();

        if (profile?.address) {
          // Parse address to extract street and number
          const addressParts = profile.address.split(',');
          const street = addressParts[0]?.trim() || profile.address;
          const number = addressParts[1]?.trim() || '';
          setUserAddress({ street, number });
        }
      }
    };

    fetchUserProfile();
  }, []);
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
        
        <div 
          className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          onClick={() => setIsAddressOpen(true)}
        >
          <MapPin className="w-4 h-4" />
          {userAddress ? (
            <div className="flex flex-col">
              <span className="text-xs">{userAddress.street}</span>
              {userAddress.number && <span className="text-xs">{userAddress.number}</span>}
            </div>
          ) : (
            <span>{location}</span>
          )}
        </div>
        
        <AccountSettingsModal />
      </div>
      
      <AddressModal 
        open={isAddressOpen} 
        onOpenChange={setIsAddressOpen} 
      />
    </header>
  );
};