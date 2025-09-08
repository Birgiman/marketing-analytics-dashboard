import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GroupSearchSelector } from '@/components/GroupSearchSelector';
import { useLives } from '@/hooks/useLives';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';

interface CreateLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentInstance?: any;
  onLiveCreated?: () => void;
  editingLive?: any;
}

interface GroupResult {
  id: string;
  group_id: string;
  group_name: string;
  group_size: number;
  group_owner?: string;
  group_created_at?: string;
  group_created_formatted: string;
  group_owner_formatted?: string;
  selectable: boolean;
}

export const CreateLiveModal = ({ open, onOpenChange, currentInstance, onLiveCreated, editingLive }: CreateLiveModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGroups, setSelectedGroups] = useState<GroupResult[]>([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const { createLiveWithGroups, isLoading } = useLives();
  
  const [formData, setFormData] = useState({
    liveName: '',
    captureStart: '',
    liveStart: '',
    liveEnd: '',
    salesTarget: '',
    leadsTarget: '',
    adsBudget: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleGroupsSelected = (groups: GroupResult[]) => {
    setSelectedGroups(groups);
    setShowGroupSelector(false);
  };

  const handleRemoveGroup = (groupId: string) => {
    setSelectedGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const parseNumericValue = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const handleCreate = async () => {
    try {
      const liveData = {
        name: formData.liveName,
        live_date: formData.liveStart || undefined,
        captacao_start: formData.captureStart || undefined,
        ta_rolando_start: formData.liveStart || undefined,
        ta_rolando_end: formData.liveEnd || undefined,
        sales_goal: parseNumericValue(formData.salesTarget),
        leads_goal: parseNumericValue(formData.leadsTarget),
        ad_budget: parseNumericValue(formData.adsBudget)
      };

      const groups = selectedGroups.map(group => ({
        group_id: group.group_id,
        group_name: group.group_name,
        group_size: group.group_size
      }));

      await createLiveWithGroups(liveData, groups);
      onLiveCreated?.();
      handleClose();
    } catch (error) {
      console.error('Error creating live:', error);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedGroups([]);
    setFormData({
      liveName: '',
      captureStart: '',
      liveStart: '',
      liveEnd: '',
      salesTarget: '',
      leadsTarget: '',
      adsBudget: ''
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-center">
              {currentStep === 1 ? 'Vamos criar sua LiveShop! 🛍️' : 'Adicionar Grupos WhatsApp 📱'}
            </DialogTitle>
            <div className="text-center text-sm text-muted-foreground">
              Etapa {currentStep} de 2
            </div>
          </DialogHeader>

          {currentStep === 1 ? (
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
                    placeholder="Ex: 5000"
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
                    placeholder="Ex: 100"
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
                  placeholder="Ex: 2000"
                  value={formData.adsBudget}
                  onChange={(e) => handleInputChange('adsBudget', e.target.value)}
                />
              </div>

              {/* Actions Step 1 */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleNextStep}
                  className="flex-1"
                  disabled={!formData.liveName.trim()}
                >
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Live Info Summary */}
              <div className="bg-muted p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-1">Live: {formData.liveName}</h4>
                <p className="text-xs text-muted-foreground">
                  Agora vamos adicionar os grupos do WhatsApp
                </p>
              </div>

              {/* Groups Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Grupos selecionados</Label>
                  <Button 
                    onClick={() => setShowGroupSelector(true)}
                    size="sm"
                    variant="outline"
                  >
                    + Buscar grupos
                  </Button>
                </div>

                {selectedGroups.length === 0 ? (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum grupo selecionado ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em "Buscar grupos" para adicionar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedGroups.map((group) => (
                      <div key={group.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{group.group_name}</p>
                          <p className="text-xs text-muted-foreground">{group.group_size} participantes</p>
                        </div>
                        <Button
                          onClick={() => handleRemoveGroup(group.id)}
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedGroups.length > 0 && (
                  <Badge variant="secondary" className="w-fit">
                    {selectedGroups.length} grupo(s) selecionado(s)
                  </Badge>
                )}
              </div>

              {/* Actions Step 2 */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePrevStep}
                  className="flex-1"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button 
                  onClick={handleCreate}
                  className="flex-1"
                  disabled={isLoading || selectedGroups.length === 0}
                >
                  {isLoading ? 'Criando...' : 'Criar LiveShop'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Group Search Modal */}
      <GroupSearchSelector
        isOpen={showGroupSelector}
        onClose={() => setShowGroupSelector(false)}
        onGroupsSelected={handleGroupsSelected}
        currentInstance={currentInstance}
      />
    </>
  );
};