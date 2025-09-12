import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { whatsappService } from '@/services/whatsappService';
import { DEMO_MODE, DEMO_WHATSAPP_INSTANCES } from '@/lib/demo-mode';
import { generateDemoQR } from '@/lib/demo-qr';
import { WhatsAppInstance, WhatsAppStatus } from '@/types';
import { useCallback, useEffect, useState } from 'react';

export type ConnectionState = WhatsAppStatus;

export interface UseWhatsAppConnectionResult {
  instances: WhatsAppInstance[];
  currentInstance: WhatsAppInstance | null;
  connectionState: ConnectionState;
  qrCode: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  checkStatus: () => Promise<void>;
  generateQR: () => Promise<void>;
  refreshInstances: () => Promise<void>;
  syncWithAPI: () => Promise<void>;
}

export const useWhatsAppConnection = (): UseWhatsAppConnectionResult => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [currentInstance, setCurrentInstance] = useState<WhatsAppInstance | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Polling para verificar status quando pendente
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const getUserId = useCallback(async () => {
    if (DEMO_MODE) {
      return 'demo-user-123';
    }
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id;
  }, []);

  // Sincronizar status com Evolution API
  const syncWithAPI = useCallback(async () => {
    if (DEMO_MODE) return;

    setIsSyncing(true);
    try {
      const userId = await getUserId();
      if (!userId) return;

      await whatsappService.syncInstanceStatus(userId);
      
      toast.success({
        title: "Status sincronizado",
        description: "Informações atualizadas com sucesso",
        duration: 3000
      });
    } catch (err: any) {
      console.error('Erro ao sincronizar:', err);
      toast.error({
        title: "Erro na sincronização",
        description: err.message || 'Falha ao sincronizar com Evolution API',
        duration: 7000
      });
    } finally {
      setIsSyncing(false);
    }
  }, [getUserId, toast]);

  // Carregar instâncias do usuário
  const refreshInstances = useCallback(async () => {
    try {
      if (DEMO_MODE) {
        // Modo demo - usar dados fictícios
        setInstances(DEMO_WHATSAPP_INSTANCES);
        const current = DEMO_WHATSAPP_INSTANCES[0] || null;
        setCurrentInstance(current);
        setConnectionState(current?.status || 'disconnected');
        if (current?.qr_code) {
          setQrCode(current.qr_code);
        }
        return;
      }

      const userId = await getUserId();
      if (!userId) return;

      const userInstances = await whatsappService.getUserInstances(userId);
      setInstances(userInstances);

      // Definir instância atual (mais recente)
      const current = userInstances[0] || null;
      setCurrentInstance(current);

      // Preserve local pending-qr/QR code to avoid UI flicker during reconnect
      setConnectionState((prev) => (prev === 'pending-qr' || !!qrCode ? prev : (current?.status || 'disconnected')));

      if (!qrCode && current?.qr_code) {
        setQrCode(current.qr_code);
      }
    } catch (err) {
      console.error('Erro ao carregar instâncias:', err);
      setError('Falha ao carregar instâncias WhatsApp');
    }
  }, [getUserId]);

  // Conectar WhatsApp
  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (DEMO_MODE) {
        // Modo demo - simular conexão com QR fake
        setConnectionState('connecting');
        toast({
          title: "Conectando WhatsApp",
          description: "Criando nova instância...",
        });
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simular delay
        
        const demoQR = generateDemoQR();
        setQrCode(demoQR);
        setConnectionState('pending-qr');
        
        toast({
          title: "QR Code gerado (Demo)",
          description: "Modo demo - QR Code simulado",
        });
        
        setIsLoading(false);
        return;
      }

      const userId = await getUserId();
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      setConnectionState('connecting');
      toast({
        title: "Conectando WhatsApp",
        description: "Criando nova instância...",
      });

      const result = await whatsappService.createWhatsAppInstance(userId);
      
      if (result.success) {
        setConnectionState('pending-qr');
        if (result.qr_code) {
          setQrCode(result.qr_code);
        }
        
        await refreshInstances();
        
        // Iniciar polling para verificar conexão
        startStatusPolling();
        
        toast({
          title: "QR Code gerado",
          description: "Escaneie com seu WhatsApp para conectar",
        });
      }
    } catch (err: any) {
      setConnectionState('error');
      setError(err.message || 'Erro ao conectar WhatsApp');
      toast({
        title: "Erro ao conectar",
        description: err.message || 'Falha na conexão com WhatsApp',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getUserId, refreshInstances, toast]);

  // Desconectar WhatsApp
  const disconnect = useCallback(async () => {
    if (!currentInstance) return;

    setIsLoading(true);
    setError(null);

    try {
      const userId = await getUserId();
      if (!userId) return;
      
      await whatsappService.disconnectInstance(currentInstance.instance_name, userId);
      
      setConnectionState('disconnected');
      setQrCode(null);
      // NÃO limpar currentInstance para manter referência para reconexão
      // setCurrentInstance(null);
      
      // Parar polling
      stopStatusPolling();
      
      await refreshInstances();
      
      toast({
        title: "WhatsApp desconectado",
        description: "Instância foi desconectada com sucesso",
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao desconectar WhatsApp');
      toast({
        title: "Erro ao desconectar",
        description: err.message || 'Falha ao desconectar WhatsApp',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentInstance, refreshInstances, toast, getUserId]);

  // Verificar status da conexão
  const checkStatus = useCallback(async () => {
    if (!currentInstance) return;

    try {
      const userId = await getUserId();
      if (!userId) return;
      
      const status = await whatsappService.checkConnectionStatus(currentInstance.instance_name, userId);
      
      let newState: ConnectionState;
      if (status.connected) {
        newState = 'connected';
      } else if (connectionState === 'pending-qr' || !!qrCode || currentInstance.status === 'pending-qr') {
        newState = 'pending-qr';
      } else {
        newState = 'disconnected';
      }

      if (newState !== connectionState) {
        setConnectionState(newState);
        
        // Atualizar no Supabase se mudou
        await whatsappService.updateInstanceStatus(currentInstance.instance_name, newState);
        
        if (newState === 'connected') {
          setQrCode(null);
          stopStatusPolling();
          toast({
            title: "WhatsApp conectado!",
            description: "Conexão estabelecida com sucesso",
          });
        }
        
        await refreshInstances();
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    }
  }, [currentInstance, connectionState, refreshInstances, toast, getUserId]);

  // Gerar novo QR code
  const generateQR = useCallback(async () => {
    if (!currentInstance) return;

    setIsLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) return;
      
      const qrCode = await whatsappService.getInstanceQRCode(currentInstance.instance_name, userId);
      setQrCode(qrCode);
      setConnectionState('pending-qr');
      
      await whatsappService.updateInstanceStatus(currentInstance.instance_name, 'pending-qr', qrCode);
      
      // Reiniciar polling
      startStatusPolling();
      
      toast({
        title: "Novo QR Code",
        description: "QR Code atualizado, escaneie novamente",
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar QR code');
      toast({
        title: "Erro ao gerar QR",
        description: err.message || 'Falha ao gerar novo QR code',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentInstance, toast, getUserId]);

  // Iniciar polling de status
  const startStatusPolling = useCallback(() => {
    stopStatusPolling(); // Limpar polling anterior
    
    const interval = setInterval(() => {
      checkStatus();
    }, 5000); // Verificar a cada 5 segundos
    
    setPollingInterval(interval);
    
    // Timeout de 5 minutos
    const timeoutId = setTimeout(() => {
      stopStatusPolling();
      // Verificar o estado ATUAL no momento do timeout, não o estado capturado no closure
      setConnectionState(currentState => {
        if (currentState === 'pending-qr') {
          setError('Timeout: QR Code expirado');
          toast({
            title: "QR Code expirado",
            description: "Tempo limite excedido, gere um novo QR code",
            variant: "destructive",
          });
          return 'error';
        }
        // Se não está mais pending-qr, não fazer nada
        return currentState;
      });
    }, 5 * 60 * 1000);
    
    // Guardar referência do timeout para poder cancelar se necessário
    return timeoutId;
  }, [checkStatus, toast]);

  // Parar polling de status
  const stopStatusPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  // Carregar instâncias e sincronizar ao montar componente
  useEffect(() => {
    const initializeConnection = async () => {
      await syncWithAPI(); // Primeiro sincronizar com API
      await refreshInstances(); // Depois carregar dados atualizados
    };
    
    initializeConnection();
    
    return () => {
      stopStatusPolling();
    };
  }, [syncWithAPI, refreshInstances, stopStatusPolling]);

  // Iniciar polling se houver instância pendente
  useEffect(() => {
    if (connectionState === 'pending-qr' && !pollingInterval) {
      startStatusPolling();
    } else if (connectionState !== 'pending-qr' && pollingInterval) {
      stopStatusPolling();
    }
  }, [connectionState, pollingInterval, startStatusPolling, stopStatusPolling]);

  return {
    instances,
    currentInstance,
    connectionState,
    qrCode,
    isLoading,
    isSyncing,
    error,
    connect,
    disconnect,
    checkStatus,
    generateQR,
    refreshInstances,
    syncWithAPI
  };
};