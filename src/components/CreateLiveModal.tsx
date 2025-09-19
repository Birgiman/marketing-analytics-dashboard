import CampaignSelector from '@/components/CampaignSelector';
import { GroupSearchSelector } from '@/components/GroupSearchSelector';
import { MetaApiTestModal } from '@/components/MetaApiTestModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaskedInput } from '@/components/ui/masked-input';
import { useToast } from '@/hooks/use-toast';
import { useLives } from '@/hooks/useLives';
import { supabase } from '@/integrations/supabase/client';
import { Live, LiveCampaign, LiveGroup, WhatsAppInstance } from '@/types/live';
import { MetaCampaign } from '@/utils/metaApi';
import { AlertTriangle, ChevronLeft, ChevronRight, Target, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CreateLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentInstance?: WhatsAppInstance;
  onLiveCreated?: () => void;
  editingLive?: Live;
}

// GroupResult é equivalente a LiveGroup com selectable
interface GroupResult extends LiveGroup {
  selectable: boolean;
}

// Helper function for pluralization
const pluralize = (count: number, singular: string, plural: string) => {
  if (count === 0) {
    return `Nenhum${singular.includes('campanha') ? 'a' : ''} ${singular}`;
  }
  if (count === 1) {
    return `1 ${singular}`;
  }
  return `${count} ${plural}`;
};

export const CreateLiveModal = ({ open, onOpenChange, currentInstance, onLiveCreated, editingLive }: CreateLiveModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedGroups, setSelectedGroups] = useState<GroupResult[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<MetaCampaign[]>([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [linkedCampaigns, setLinkedCampaigns] = useState<LiveCampaign[]>([]);
  const [campaignSearchTerm, setCampaignSearchTerm] = useState<string>('');
  const [selectedCampaignsToDelete, setSelectedCampaignsToDelete] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const { createLiveWithGroups, updateLiveWithGroups, isLoading } = useLives();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    liveName: '',
    captureStart: '',
    liveStart: '',
    liveEnd: '',
    salesTarget: '',
    leadsTarget: '',
    adsBudget: ''
  });

  // Estado para intervalo de datas dos insights das campanhas
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      since: firstDayOfMonth.toISOString().split('T')[0], // YYYY-MM-DD
      until: now.toISOString().split('T')[0] // YYYY-MM-DD
    };
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

  // Load linked campaigns when editing
  const loadLinkedCampaigns = async (liveId: string) => {
    try {
      const { data: campaigns, error } = await supabase
        .from('live_campaigns')
        .select('*')
        .eq('live_id', liveId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading linked campaigns:', error);
        return;
      }

      setLinkedCampaigns(campaigns || []);
    } catch (error) {
      console.error('Error loading linked campaigns:', error);
    }
  };

  // Populate form when editing
  useEffect(() => {
    if (editingLive && open) {
      console.log('🔍 [CreateLiveModal] Carregando dados da live:', {
        sales_goal: editingLive.sales_goal,
        leads_goal: editingLive.leads_goal,
        ad_budget: editingLive.ad_budget,
        name: editingLive.name
      });

      setFormData({
        liveName: editingLive.name || '',
        captureStart: editingLive.captacao_start ? new Date(editingLive.captacao_start).toISOString().slice(0, 16) : '',
        liveStart: editingLive.ta_rolando_start ? new Date(editingLive.ta_rolando_start).toISOString().slice(0, 16) : '',
        liveEnd: editingLive.ta_rolando_end ? new Date(editingLive.ta_rolando_end).toISOString().slice(0, 16) : '',
        salesTarget: editingLive.sales_goal?.toString() || '',
        leadsTarget: editingLive.leads_goal?.toString() || '',
        adsBudget: editingLive.ad_budget ? (editingLive.ad_budget * 100).toString() : ''
      });

      console.log('🔍 [CreateLiveModal] FormData atualizado:', {
        salesTarget: editingLive.sales_goal?.toString() || '',
        leadsTarget: editingLive.leads_goal?.toString() || '',
        adsBudget: editingLive.ad_budget ? (editingLive.ad_budget * 100).toString() : ''
      });

      // Carregar dateRange se existir
      if (editingLive.insights_date_since && editingLive.insights_date_until) {
        setDateRange({
          since: editingLive.insights_date_since,
          until: editingLive.insights_date_until
        });
      }

      // Set selected groups if editing
      if (editingLive.live_groups) {
        const groups = editingLive.live_groups.map((group: LiveGroup) => ({
          id: group.id,
          group_id: group.group_id,
          group_name: group.group_name,
          group_size: group.group_size,
          selectable: true,
          group_created_formatted: 'N/A'
        }));
        setSelectedGroups(groups);
      }

      // Load linked campaigns if editing
      loadLinkedCampaigns(editingLive.id);
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

  const handleCampaignsSelected = (campaigns: MetaCampaign[], searchTerm?: string) => {
    setSelectedCampaigns(campaigns);
    if (searchTerm) {
      setCampaignSearchTerm(searchTerm);
      console.log('🔍 [CreateLiveModal] Termo de busca capturado:', searchTerm);
    }
    setShowCampaignSelector(false);
  };

  const handleRemoveCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => prev.filter(c => c.id !== campaignId));
  };

  const handleToggleCampaignForDeletion = (campaignId: string) => {
    setSelectedCampaignsToDelete(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId);
      } else {
        return [...prev, campaignId];
      }
    });
  };

  const handleDeleteSelectedCampaigns = async () => {
    if (selectedCampaignsToDelete.length === 0) return;

    try {
      const { error } = await supabase
        .from('live_campaigns')
        .delete()
        .in('id', selectedCampaignsToDelete);

      if (error) {
        console.error('Error deleting campaigns:', error);
        toast({
          title: "❌ Erro ao excluir campanhas",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Remove from local state
      setLinkedCampaigns(prev => prev.filter(c => !selectedCampaignsToDelete.includes(c.id)));
      setSelectedCampaignsToDelete([]);

      toast({
        title: "✅ Campanhas removidas",
        description: `${selectedCampaignsToDelete.length} campanha(s) removida(s) da Live com sucesso.`
      });
    } catch (error) {
      console.error('Error deleting campaigns:', error);
      toast({
        title: "❌ Erro ao excluir campanhas",
        description: "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const parseNumericValue = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const parseCurrencyValue = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) / 100 : 0;
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
        ad_budget: parseCurrencyValue(formData.adsBudget),
        insights_date_since: dateRange.since,
        insights_date_until: dateRange.until,
        campaign_search_term: campaignSearchTerm || undefined
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
    setLinkedCampaigns([]);
    setSelectedCampaignsToDelete([]);
    setFormData({
      liveName: '',
      captureStart: '',
      liveStart: '',
      liveEnd: '',
      salesTarget: '',
      leadsTarget: '',
      adsBudget: ''
    });
    // Reset dateRange para valores padrão
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateRange({
      since: firstDayOfMonth.toISOString().split('T')[0],
      until: now.toISOString().split('T')[0]
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl w-full max-h-[850px] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-center">
              {editingLive ? 'Editar LiveShop 🛍️' : (
                currentStep === 1 ? 'Vamos criar sua LiveShop! 🛍️' : 
                currentStep === 2 ? 'Adicionar Grupos WhatsApp 📱' : 
                'Vincular Campanhas Meta Ads 🎯'
              )}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              {editingLive 
                ? 'Atualize as configurações da sua live de vendas' 
                : `Etapa ${currentStep} de 3 - ${currentStep === 1 ? 'Configure os dados básicos da sua live' : currentStep === 2 ? 'Selecione os grupos do WhatsApp para monitorar' : 'Vincule campanhas do Meta Ads para análise'}`
              }
            </DialogDescription>
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
                  <MaskedInput
                    id="salesTarget"
                    mask="number"
                    placeholder="Ex: 5.000"
                    value={formData.salesTarget}
                    onChange={(value) => handleInputChange('salesTarget', value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadsTarget" className="text-sm font-medium">
                    Meta de leads
                  </Label>
                  <MaskedInput
                    id="leadsTarget"
                    mask="number"
                    placeholder="Ex: 10.000"
                    value={formData.leadsTarget}
                    onChange={(value) => handleInputChange('leadsTarget', value)}
                  />
                </div>
              </div>

              {/* Orçamento para anúncios */}
              <div className="space-y-2">
                <Label htmlFor="adsBudget" className="text-sm font-medium">
                  Orçamento para anúncios
                </Label>
                <MaskedInput
                  id="adsBudget"
                  mask="currency"
                  placeholder="Ex: R$ 2.000,00"
                  value={formData.adsBudget}
                  onChange={(value) => handleInputChange('adsBudget', value)}
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
                  <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg p-3">
                    {selectedGroups.map((group) => (
                      <div key={group.id} className="flex items-start justify-between p-2 bg-green-50 border border-green-200 rounded-lg gap-2">
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
                  <Badge variant="outline" className="w-fit border-green-300 text-green-700">
                    Total: {selectedGroups.length}
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
              <div className="space-y-4 flex-1 min-h-0">
                {/* Already Linked Campaigns */}
                {editingLive && linkedCampaigns.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Campanhas já vinculadas</Label>
                      {selectedCampaignsToDelete.length > 0 && (
                        <Button
                          onClick={handleDeleteSelectedCampaigns}
                          size="sm"
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir ({selectedCampaignsToDelete.length})
                        </Button>
                      )}
                    </div>

                    <div className="max-h-40 max-w-full overflow-x-auto overflow-y-auto space-y-2 pr-2">
                      {linkedCampaigns.map((campaign) => (
                        <div key={campaign.id} className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <Checkbox
                            checked={selectedCampaignsToDelete.includes(campaign.id)}
                            onCheckedChange={() => handleToggleCampaignForDeletion(campaign.id)}
                            className="mt-0.5"
                          />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium break-words leading-tight">{campaign.campaign_name}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {campaign.campaign_id} • Status: {campaign.status}
                            </p>
                            {campaign.account_name && (
                              <p className="text-xs text-blue-600">Conta: {campaign.account_name}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedCampaignsToDelete.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <AlertTriangle className="h-3 w-3" />
                        {selectedCampaignsToDelete.length} campanha(s) selecionada(s) para exclusão
                      </div>
                    )}
                  </div>
                )}

                {/* New Campaigns to Add */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {editingLive ? 'Adicionar novas campanhas' : 'Campanhas vinculadas'}
                    </Label>
                    <Button
                      onClick={() => setShowCampaignSelector(true)}
                      size="sm"
                      variant="outline"
                    >
                      + Buscar campanhas
                    </Button>
                  </div>

                  {selectedCampaigns.length === 0 ? (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                      <Target className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        {editingLive ? 'Nenhuma nova campanha para adicionar' : 'Nenhuma campanha selecionada ainda'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clique em "Buscar campanhas" para adicionar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 max-w-full overflow-x-auto overflow-y-auto pr-2">
                      {selectedCampaigns.map((campaign) => (
                        <div key={campaign.id} className="flex items-start justify-between p-2 bg-green-50 border border-green-200 rounded-lg gap-2">
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
                </div>

                {/* Summary */}
                <div className="flex gap-2">
                  {editingLive && linkedCampaigns.length > 0 && (
                    <Badge variant="secondary" className="w-fit">
                      {pluralize(linkedCampaigns.length, 'já vinculada', 'já vinculadas')}
                    </Badge>
                  )}
                  {selectedCampaigns.length > 0 && (
                    <Badge variant="outline" className="w-fit border-green-300 text-green-700">
                      Total: {(linkedCampaigns?.length || 0) + selectedCampaigns.length}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Test Button for Complete Data Fetching */}
              {editingLive && (
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTestModal(true)}
                    className="w-full text-xs"
                  >
                    🧪 Testar coleta completa de dados
                  </Button>
                </div>
              )}

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

      {/* Modal de Teste da API Meta */}
      {editingLive && (
        <MetaApiTestModal
          open={showTestModal}
          onOpenChange={setShowTestModal}
          liveId={editingLive.id}
        />
      )}

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
        linkedCampaigns={linkedCampaigns.map(c => c.campaign_id)}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
    </>
  );
};