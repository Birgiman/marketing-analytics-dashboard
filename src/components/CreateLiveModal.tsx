import CampaignSelector from '@/components/CampaignSelector';
import { GroupSearchSelector } from '@/components/GroupSearchSelector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MaskedInput } from '@/components/ui/masked-input';
import { useToast } from '@/hooks/use-toast';
import { useLives } from '@/hooks/useLives';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_MODE } from '@/lib/demo-mode';
import { Live, LiveCampaign, LiveGroup, WhatsAppInstance } from '@/types/live';
import { MetaCampaign } from '@/utils/metaApi';
import { ChevronLeft, ChevronRight, Target, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CreateLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentInstance?: WhatsAppInstance;
  onLiveCreated?: () => void;
  editingLive?: Live;
}

// GroupResult é equivalente a LiveGroup com selectable
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
  const [campaignSearchTerm, setCampaignSearchTerm] = useState<string>('Meta Campanha');
  const [whatsappSearchTerm, setWhatsappSearchTerm] = useState<string>('WhatsApp Grupos Teste');
  const [userId, setUserId] = useState<string | null>(null);
  const { createLiveWithGroups, updateLiveWithGroups, isLoading } = useLives();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    liveName: 'Campanha Teste',
    captureStart: '2025-01-01T08:00',
    liveStart: '2025-01-01T10:00',
    liveEnd: '2025-01-31T18:00',
    salesTarget: '2000',
    leadsTarget: '5000',
    adsBudget: '2000'
  });

  // Estado para intervalo de datas dos insights das campanhas
  const [dateRange, setDateRange] = useState({
    since: '', // Vazio para criação
    until: '' // Vazio para criação
  });

  // Get current user
  useEffect(() => {
    if (open) {
      const getCurrentUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 [CreateLiveModal] Session:', session);
        if (session?.user) {
          console.log('✅ [CreateLiveModal] Setting userId:', session.user.id);
          setUserId(session.user.id);
        } else {
          console.log('❌ [CreateLiveModal] No session or user found');
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
        return;
      }

      setLinkedCampaigns(campaigns || []);
    } catch (error) {
      console.error('❌ [CreateLiveModal] Erro ao carregar campanhas vinculadas:', error);
    }
  };

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
          group_created_formatted: 'N/A',
          live_id: editingLive.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        setSelectedGroups(groups);
      }


      // Load linked campaigns if editing
      loadLinkedCampaigns(editingLive.id);

      // Set search terms if editing
      if (editingLive.whatsapp_search_term) {
        setWhatsappSearchTerm(editingLive.whatsapp_search_term);
      }
      
      if (editingLive.campaign_search_term) {
        setCampaignSearchTerm(editingLive.campaign_search_term);
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

  const handleGroupsSelected = (groups: GroupResult[], searchTerm: string) => {
    setSelectedGroups(groups);
    setWhatsappSearchTerm(searchTerm);
    setShowGroupSelector(false);
  };

  // Função removida - não permitimos mais deletar grupos individualmente

  const handleCampaignsSelected = (campaigns: MetaCampaign[], searchTerm?: string) => {
    setSelectedCampaigns(campaigns);
    if (searchTerm) {
      setCampaignSearchTerm(searchTerm);
    }
    setShowCampaignSelector(false);
  };

  const handleRemoveCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => prev.filter(c => c.id !== campaignId));
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
      // Calcular timestamp 31 minutos atrás para garantir cache válido
      const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000).toISOString();

      const liveData = {
        name: formData.liveName,
        live_date: formData.liveStart,
        captacao_start: formData.captureStart,
        ta_rolando_start: formData.liveStart,
        ta_rolando_end: formData.liveEnd,
        sales_goal: parseNumericValue(formData.salesTarget),
        leads_goal: parseNumericValue(formData.leadsTarget),
        ad_budget: parseCurrencyValue(formData.adsBudget),
        insights_date_since: dateRange.since,
        insights_date_until: dateRange.until,
        campaign_search_term: campaignSearchTerm,
        whatsapp_search_term: whatsappSearchTerm,
        // Definir timestamps de sincronização 31 minutos atrás para garantir cache válido
        last_synced_at: thirtyOneMinutesAgo,
        traffic_last_synced_at: thirtyOneMinutesAgo
      };

      const groups = selectedGroups.map(group => ({
        group_id: group.group_id,
        group_name: group.group_name,
        group_size: group.group_size
      }));

      // No modo demo, apenas "criar" via Supabase mock
      if (DEMO_MODE) {
        console.log('🎯 [CreateLiveModal] DEMO MODE - Criando campanha via mock');
        
        // O insert no Supabase mock vai marcar a flag hasCreatedLive = true
        await createLiveWithGroups(liveData, selectedGroups, selectedCampaigns);
        
        console.log('✅ [CreateLiveModal] Campanha mockada criada');
        console.log('📝 [CreateLiveModal] Dados:', liveData);
        
        toast({
          title: "Campanha criada!",
          description: `${formData.liveName} foi criada com sucesso.`
        });
        
        onLiveCreated?.();
        handleClose();
        return;
      }
      
      // Código de produção (com Supabase real)
      if (editingLive) {
        await updateLiveWithGroups(editingLive.id, liveData, groups, selectedCampaigns);
      } else {
        await createLiveWithGroups(liveData, groups, selectedCampaigns);
      }
      
      onLiveCreated?.();
      handleClose();
    } catch (error) {
      console.error('❌ [CreateLiveModal] Erro ao criar/editar live:', error);
      toast({
        title: "Erro ao salvar live",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedGroups([]);
    setSelectedCampaigns([]);
    setLinkedCampaigns([]);
    setWhatsappSearchTerm('');
    setFormData({
      liveName: '',
      captureStart: '',
      liveStart: '',
      liveEnd: '',
      salesTarget: '',
      leadsTarget: '',
      adsBudget: ''
    });
    // Reset dateRange para valores vazios
    setDateRange({
      since: '',
      until: ''
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl w-full max-h-[850px] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-center">
              {editingLive ? 'Editar Analytics 🛍️' : (
                currentStep === 1 ? 'Vamos criar sua Analytics! 🛍️' : 
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
              {/* Nome da Campanha */}
              <div className="space-y-2">
                <Label htmlFor="liveName" className="text-sm font-medium">
                  Nome da Campanha
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

              {/* Quando é sua Analytics */}
              <div className="space-y-2">
                <Label htmlFor="liveStart" className="text-sm font-medium">
                  Quando é sua Analytics?
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
                  <Label className="text-sm font-medium">Grupos encontrados</Label>
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
                      Nenhum grupo encontrado ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em "Buscar grupos" para verificar o termo de busca
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg p-3">
                    {selectedGroups.map((group) => (
                      <div key={group.id} className="flex items-start p-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-words leading-tight">{group.group_name}</p>
                          <p className="text-xs text-muted-foreground">{group.group_size} participantes</p>
                        </div>
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

                {linkedCampaigns.length === 0 && selectedCampaigns.length === 0 ? (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma campanha vinculada ainda
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique em "Buscar campanhas" para vincular
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg p-3">
                    {/* Campanhas já vinculadas */}
                    {linkedCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-start p-2 bg-blue-50 border border-blue-200 rounded-lg">
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
                    
                    {/* Novas campanhas selecionadas */}
                    {selectedCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-start p-2 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium break-words leading-tight">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Status: {campaign.status} • Criada: {new Date(campaign.created_time).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                                 {(linkedCampaigns.length > 0 || selectedCampaigns.length > 0) && (
                   <Badge variant="outline" className="w-fit border-blue-300 text-blue-700">
                     Total: {linkedCampaigns.length + selectedCampaigns.length}
                   </Badge>
                 )}
              </div>

              {/* Test functionality removed for now */}

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
                  {isLoading ? (editingLive ? 'Salvando...' : 'Criando...') : (editingLive ? 'Salvar Alterações' : 'Criar Analytics')}
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
        initialSearchTerm={whatsappSearchTerm}
      />

      {/* Campaign Selector Modal */}
      <CampaignSelector
        isOpen={showCampaignSelector}
        onClose={() => setShowCampaignSelector(false)}
        onCampaignsSelected={handleCampaignsSelected}
        userId={userId || undefined}
        alreadySelected={selectedCampaigns}
        linkedCampaigns={linkedCampaigns.map(c => c.campaign_id)}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        initialSearchTerm={campaignSearchTerm}
      />
    </>
  );
};