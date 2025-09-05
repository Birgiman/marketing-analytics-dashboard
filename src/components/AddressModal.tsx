import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddressModal = ({ open, onOpenChange }: AddressModalProps) => {
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: ""
  });

  const handleSave = () => {
    // Save address logic here
    console.log("Saving address:", address);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Endereço de Envio
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Rua/Endereço</Label>
            <Input
              id="street"
              placeholder="Rua das Flores, 123"
              value={address.street}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                placeholder="São Paulo"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                placeholder="SP"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="zipCode">CEP</Label>
            <Input
              id="zipCode"
              placeholder="01234-567"
              value={address.zipCode}
              onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
            />
          </div>
        </div>
        
        <div className="flex justify-between pt-4">
          <Button
            variant="default"
            onClick={handleSave}
            className="bg-slate-900 hover:bg-slate-800 text-white px-8"
          >
            Salvar Endereço
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="text-muted-foreground"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};