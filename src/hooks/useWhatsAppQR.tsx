import { useToast } from '@/hooks/useToast';
import { supabase } from '@/lib/supabase';
import { whatsappService } from '@/services/whatsappService';
import { WhatsAppInstance } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

export type QRStatus = 'generating' | 'active' | 'refreshing' | 'connected' | 'error';

export interface UseWhatsAppQRResult {
  qrCode: string | null;
  status: QRStatus;
  countdown: number;
  attempts: number;
  isLoading: boolean;
  error: string | null;
  instance: WhatsAppInstance | null;
  initializeQR: () => Promise<void>;
  refreshQR: () => Promise<void>;
  disconnect: () => Promise<void>;
  cancelAndDelete: () => Promise<void>;
  resetAttempts: () => void;
}

const QR_EXPIRY_TIME = 50; // 50 segundos
const MAX_ATTEMPTS = 5;
const STATUS_CHECK_INTERVAL = 10000; // 10 segundos

export const useWhatsAppQR = (): UseWhatsAppQRResult => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<QRStatus>('generating');
  const [countdown, setCountdown] = useState(QR_EXPIRY_TIME);
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  
  const { toast } = useToast();
  
  // Refs para intervals
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getUserId = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id;
  }, []);

  // Limpar todos os intervals
  const clearAllIntervals = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
    if (autoRefreshTimeoutRef.current) {
      clearTimeout(autoRefreshTimeoutRef.current);
      autoRefreshTimeoutRef.current = null;
    }
  }, []);

  // Iniciar countdown do QR
  const startCountdown = useCallback(() => {
    setCountdown(QR_EXPIRY_TIME);
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // QR expirou, fazer auto-refresh
          if (attempts < MAX_ATTEMPTS) {
            refreshQR();
          } else {
            setStatus('error');
            setError('Máximo de tentativas excedido');
            toast({
              title: "Erro na conexão",
              description: "Muitas tentativas falharam. Tente novamente mais tarde.",
              variant: "destructive",
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [attempts, toast]);

  // Verificar status da conexão
  const checkConnectionStatus = useCallback(async () => {
    if (!instance || status === 'connected' || status === 'error') return;

    try {
      const userId = await getUserId();
      if (!userId) return;
      
      const connectionStatus = await whatsappService.checkConnectionStatus(instance.instance_name, userId);
      
      if (connectionStatus.connected) {
        setStatus('connected');
        setQrCode(null);
        clearAllIntervals();
        
        // Atualizar status no banco
        await whatsappService.updateInstanceStatus(instance.instance_name, 'connected');
        
        toast({
          title: "WhatsApp Conectado!",
          description: "Conexão estabelecida com sucesso",
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  }, [instance, status, toast, clearAllIntervals, getUserId]);

  // Iniciar polling de status
  const startStatusPolling = useCallback(() => {
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
    }

    statusCheckIntervalRef.current = setInterval(() => {
      checkConnectionStatus();
    }, STATUS_CHECK_INTERVAL);
  }, [checkConnectionStatus]);

  // Inicializar QR Code automaticamente usando perfil
  const initializeQR = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStatus('generating');
    setAttempts(0);
    
    try {
      const userId = await getUserId();
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      toast({
        title: "Conectando WhatsApp",
        description: "Criando nova instância...",
      });

      const result = await whatsappService.createWhatsAppInstance(userId);
      
      if (result.success && result.qr_code) {
        setQrCode(result.qr_code);
        setStatus('active');
        
        // Buscar a instância criada
        const instances = await whatsappService.getUserInstances(userId);
        const newInstance = instances.find(i => i.instance_name === result.instance_name);
        setInstance(newInstance || null);
        
        // Iniciar countdown e polling
        startCountdown();
        startStatusPolling();
        
        toast({
          title: "QR Code Gerado",
          description: "Escaneie com seu WhatsApp para conectar",
        });
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Erro ao gerar QR Code');
      toast({
        title: "Erro ao conectar",
        description: err.message || 'Falha na conexão com WhatsApp',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [getUserId, startCountdown, startStatusPolling, toast]);

  // Refresh QR Code
  const refreshQR = useCallback(async () => {
    if (!instance || attempts >= MAX_ATTEMPTS) return;

    setIsLoading(true);
    setStatus('refreshing');
    setAttempts(prev => prev + 1);

    try {
      const userId = await getUserId();
      if (!userId) return;
      
      const newQrCode = await whatsappService.getInstanceQRCode(instance.instance_name, userId);
      setQrCode(newQrCode);
      setStatus('active');
      
      // Atualizar status no banco
      await whatsappService.updateInstanceStatus(instance.instance_name, 'pending-qr', newQrCode);
      
      // Reiniciar countdown
      startCountdown();
      
      toast({
        title: "QR Code Atualizado",
        description: `Tentativa ${attempts + 1}/${MAX_ATTEMPTS}`,
      });
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Erro ao atualizar QR Code');
      toast({
        title: "Erro ao atualizar QR",
        description: err.message || 'Falha ao gerar novo QR Code',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [instance, attempts, startCountdown, toast, getUserId]);

  // Desconectar
  const disconnect = useCallback(async () => {
    if (!instance) return;

    setIsLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) return;
      
      await whatsappService.disconnectInstance(instance.instance_name, userId);
      
      setStatus('generating');
      setQrCode(null);
      setInstance(null);
      setAttempts(0);
      clearAllIntervals();
      
      toast({
        title: "WhatsApp Desconectado",
        description: "Instância desconectada com sucesso",
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao desconectar');
      toast({
        title: "Erro ao desconectar",
        description: err.message || 'Falha ao desconectar WhatsApp',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [instance, clearAllIntervals, toast, getUserId]);

  // Cancelar e deletar instância
  const cancelAndDelete = useCallback(async () => {
    if (!instance) {
      // Se não há instância, apenas reseta os estados
      setStatus('generating');
      setQrCode(null);
      setInstance(null);
      setAttempts(0);
      setError(null);
      clearAllIntervals();
      return;
    }

    setIsLoading(true);
    try {
      const userId = await getUserId();
      if (!userId) return;
      
      await whatsappService.deleteInstance(instance.instance_name, userId);
      
      // Resetar todos os estados
      setStatus('generating');
      setQrCode(null);
      setInstance(null);
      setAttempts(0);
      setError(null);
      clearAllIntervals();
      
      toast({
        title: "Conexão Cancelada",
        description: "Instância removida com sucesso",
      });
    } catch (err: any) {
      console.error('Erro ao deletar instância:', err);
      // Mesmo com erro, resetar estados locais
      setStatus('generating');
      setQrCode(null);
      setInstance(null);
      setAttempts(0);
      setError(null);
      clearAllIntervals();
      
      toast({
        title: "Conexão Cancelada", 
        description: "Instância removida localmente",
      });
    } finally {
      setIsLoading(false);
    }
  }, [instance, clearAllIntervals, toast, getUserId]);

  // Reset attempts
  const resetAttempts = useCallback(() => {
    setAttempts(0);
    setError(null);
    setStatus('generating');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllIntervals();
    };
  }, [clearAllIntervals]);

  return {
    qrCode,
    status,
    countdown,
    attempts,
    isLoading,
    error,
    instance,
    initializeQR,
    refreshQR,
    disconnect,
    cancelAndDelete,
    resetAttempts
  };
};