import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GroupSearchSelector } from '@/components/GroupSearchSelector';
import CampaignSelector from '@/components/CampaignSelector';
import { useLives } from '@/hooks/useLives';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  const [selectedCampaigns, setSelectedCampaigns] = useState<any[]>([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { createLiveWithGroups, updateLiveWithGroups, isLoading } = useLives();
  
  const [formData, setFormData] = useState({
    liveName: '',
    captureStart: '',
    liveStart: '',
    liveEnd: '',
    salesTarget: '',
    leadsTarget: '',
    adsBudget: ''
  });

  // Get current user
  useEffect(() => {
    if (open) {
      const getCurrentUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
        }
      };
      getCurrentUser();
    }
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (editingLive && open) {
      setFormData({
        liveName: editingLive.name || '',
        captureStart: editingLive.captacao_start ? new Date(editingLive.captacao_start).toISOString().slice(0, 16) : '',
        liveStart: editingLive.ta_rolando_start ? new Date(editingLive.ta_rolando_start).toISOString().slice(0, 16) : '',
        liveEnd: editingLive.ta_rolando_end ? new Date(editingLive.ta_rolando_end).toISOString().slice(0, 16) : '',
        salesTarget: editingLive.sales_goal?.toString() || '',
        leadsTarget: editingLive.leads_goal?.toString() || '',
        adsBudget: editingLive.ad_budget?.toString() || ''
      });
      
      // Set selected groups if editing
      if (editingLive.live_groups) {
        const groups = editingLive.live_groups.map((group: any) => ({
          id: group.id,
          group_id: group.group_id,
          group_name: group.group_name,
          group_size: group.group_size,
          selectable: true,
          group_created_formatted: 'N/A'
        }));
        setSelectedGroups(groups);
      }
    }
  }, [editingLive, open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const handleGroupsSelected = (groups: GroupResult[]) => {
    setSelectedGroups(groups);
    setShowGroupSelector(false);
  };

  const handleRemoveGroup = (groupId: string) => {
    setSelectedGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleCampaignsSelected = (campaigns: any[]) => {
    setSelectedCampaigns(campaigns);
    setShowCampaignSelector(false);
  };

  const handleRemoveCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => prev.filter(c => c.id !== campaignId));
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

      if (editingLive) {
        await updateLiveWithGroups(editingLive.id, liveData, groups, selectedCampaigns);
      } else {
        await createLiveWithGroups(liveData, groups, selectedCampaigns);
      }
      
      onLiveCreated?.();
      handleClose();
    } catch (error) {
      console.error('Error creating/updating live:', error);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedGroups([]);
    setSelectedCampaigns([]);
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
        <DialogContent className="max-w-2xl w-full max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-center">
              {editingLive ? 'Editar LiveShop 🛍️' : (
                currentStep === 1 ? 'Vamos criar sua LiveShop! 🛍️' : 
                currentStep === 2 ? 'Adicionar Grupos WhatsApp 📱' : 
                'Vincular Campanhas Meta Ads 🎯'
              )}
            </DialogTitle>
            <div className="text-center text-sm text-muted-foreground">
              Etapa {currentStep} de 3
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
                  variant="primary"
                  onClick={handleNextStep}
                  className="flex-1"
                  disabled={!formData.liveName.trim()}
                >
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : currentStep === 2 ? (
            <div className="space-y-4 flex flex-col h-full">
              {/* Live Info Summary */}
              <div className="bg-muted p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-1">Live: {formData.liveName}</h4>
                <p className="text-xs text-muted-foreground">
                  Agora vamos adicionar os grupos do WhatsApp
                </p>
              </div>

              {/* Groups Section */}
              <div className="space-y-3 flex-1 min-h-0">
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
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedGroups.map((group) => (
                      <div key={group.id} className="flex items-start justify-between p-2 bg-muted rounded-lg gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-words leading-tight">{group.group_name}</p>
                          <p className="text-xs text-muted-foreground">{group.group_size} participantes</p>
                        </div>
                        <Button
                          onClick={() => handleRemoveGroup(group.id)}
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive flex-shrink-0"
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
              <div className="flex gap-3 pt-4 mt-auto justify-center">
                <Button 
                  variant="outline" 
                  onClick={handlePrevStep}
                  className="flex-1 max-w-[150px]"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button 
                  variant="primary"
                  onClick={handleNextStep}
                  className="flex-1 max-w-[180px]"
                  disabled={selectedGroups.length === 0}
                >
                  Próximo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col h-full">
              {/* Live Info Summary */}
              <div className="bg-muted p-3 rounded-lg">
                <h4 className="font-medium text-sm mb-1">Live: {formData.liveName}</h4>
                <p className="text-xs text-muted-foreground">
                  Vincule campanhas do Meta Ads para análise integrada
                </p>
              </div>

              {/* Campaigns Section */}
              <div className="space-y-3 flex-1 min-h-0">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Campanhas vinculadas</Label>
                  <Button 
                    onClick={() => setShowCampaignSelector(true)}
                    size="sm"
                    variant="outline"
                  >
                    + Buscar campanhas
                  </Button>
                </div>

                {selectedCampaigns.length === 0 ? (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma campanha vinculada ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em "Buscar campanhas" para adicionar
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-start justify-between p-2 bg-muted rounded-lg gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-words leading-tight">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Status: {campaign.status} • Criada: {new Date(campaign.created_time).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleRemoveCampaign(campaign.id)}
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive flex-shrink-0"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedCampaigns.length > 0 && (
                  <Badge variant="secondary" className="w-fit">
                    {selectedCampaigns.length} campanha(s) vinculada(s)
                  </Badge>
                )}
              </div>

              {/* Actions Step 3 */}
              <div className="flex gap-3 pt-4 mt-auto justify-center">
                <Button 
                  variant="outline" 
                  onClick={handlePrevStep}
                  className="flex-1 max-w-[150px]"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button 
                  variant="primary"
                  onClick={handleCreate}
                  className="flex-1 max-w-[180px]"
                  disabled={isLoading}
                >
                  {isLoading ? (editingLive ? 'Salvando...' : 'Criando...') : (editingLive ? 'Salvar Alterações' : 'Criar LiveShop')}
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

      {/* Campaign Selector Modal */}
      <CampaignSelector
        isOpen={showCampaignSelector}
        onClose={() => setShowCampaignSelector(false)}
        onCampaignsSelected={handleCampaignsSelected}
        userId={userId}
        alreadySelected={selectedCampaigns}
      />
    </>
  );
};