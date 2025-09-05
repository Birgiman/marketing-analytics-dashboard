import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateLiveModal = ({ open, onOpenChange }: CreateLiveModalProps) => {
  const [formData, setFormData] = useState({
    liveName: '',
    captureStart: '',
    liveStart: '',
    liveEnd: '',
    salesTarget: 'R$ 0,00',
    leadsTarget: '0',
    adsBudget: 'R$ 0,00'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    // TODO: Implement create functionality
    console.log('Creating LiveShop:', formData);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center">
            Vamos criar sua LiveShop! 🛍️
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome da Live */}
          <div className="space-y-2">
            <Label htmlFor="liveName" className="text-sm font-medium">
              Nome da Live
            </Label>
            <Input
              id="liveName"
              placeholder="Nome da sua live..."
              value={formData.liveName}
              onChange={(e) => handleInputChange('liveName', e.target.value)}
            />
          </div>

          {/* Quando começa sua captação */}
          <div className="space-y-2">
            <Label htmlFor="captureStart" className="text-sm font-medium">
              Quando começa sua captação?
            </Label>
            <Input
              id="captureStart"
              type="datetime-local"
              placeholder="dd/mm/aaaa"
              value={formData.captureStart}
              onChange={(e) => handleInputChange('captureStart', e.target.value)}
            />
          </div>

          {/* Quando é sua LiveShop */}
          <div className="space-y-2">
            <Label htmlFor="liveStart" className="text-sm font-medium">
              Quando é sua LiveShop?
            </Label>
            <Input
              id="liveStart"
              type="datetime-local"
              placeholder="dd/mm/aaaa --:--"
              value={formData.liveStart}
              onChange={(e) => handleInputChange('liveStart', e.target.value)}
            />
          </div>

          {/* Quando termina o tá rolando */}
          <div className="space-y-2">
            <Label htmlFor="liveEnd" className="text-sm font-medium">
              Quando termina o tá rolando?
            </Label>
            <Input
              id="liveEnd"
              type="datetime-local"
              placeholder="dd/mm/aaaa"
              value={formData.liveEnd}
              onChange={(e) => handleInputChange('liveEnd', e.target.value)}
            />
          </div>

          {/* Metas - duas colunas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesTarget" className="text-sm font-medium">
                Meta de vendas
              </Label>
              <Input
                id="salesTarget"
                placeholder="R$ 0,00"
                value={formData.salesTarget}
                onChange={(e) => handleInputChange('salesTarget', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadsTarget" className="text-sm font-medium">
                Meta de leads
              </Label>
              <Input
                id="leadsTarget"
                placeholder="0"
                type="number"
                value={formData.leadsTarget}
                onChange={(e) => handleInputChange('leadsTarget', e.target.value)}
              />
            </div>
          </div>

          {/* Orçamento para anúncios */}
          <div className="space-y-2">
            <Label htmlFor="adsBudget" className="text-sm font-medium">
              Orçamento para anúncios
            </Label>
            <Input
              id="adsBudget"
              placeholder="R$ 0,00"
              value={formData.adsBudget}
              onChange={(e) => handleInputChange('adsBudget', e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              className="flex-1"
            >
              Criar LiveShop
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};