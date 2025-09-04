import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import React from 'react';

export type QRStatus = 'generating' | 'active' | 'refreshing' | 'connected' | 'error';

interface QRCodeDisplayProps {
  qrCode: string | null;
  status: QRStatus;
  countdown: number;
  attempts: number;
  maxAttempts: number;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onCancel: () => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCode,
  status,
  countdown,
  attempts,
  maxAttempts,
  isLoading,
  error,
  onRefresh,
  onCancel
}) => {
  // Calcular cor do timer baseado no countdown
  const getTimerColor = () => {
    if (countdown > 30) return 'text-green-600';
    if (countdown > 14) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Calcular progresso do timer (50s = 100%)
  const timerProgress = (countdown / 50) * 100;

  const renderStatusMessage = () => {
    switch (status) {
      case 'generating':
        return (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Gerando QR Code...</span>
          </div>
        );
      case 'refreshing':
        return (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Atualizando QR Code...</span>
          </div>
        );
      case 'connected':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>WhatsApp conectado!</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error || 'Erro na conexão'}</span>
          </div>
        );
      case 'active':
        return (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Escaneie este QR Code com seu WhatsApp
            </p>
            <div className={`text-sm font-medium ${getTimerColor()}`}>
              QR expira em: {String(Math.floor(countdown / 60)).padStart(2, '0')}:
              {String(countdown % 60).padStart(2, '0')}
            </div>
            <Progress 
              value={timerProgress} 
              className="mt-2 h-2"
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderQRCode = () => {
    if (status === 'connected') {
      return (
        <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed border-green-300 rounded-lg bg-green-50">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-2" />
            <p className="text-green-600 font-medium">Conectado!</p>
          </div>
        </div>
      );
    }

    if (status === 'generating' || status === 'refreshing' || !qrCode) {
      return (
        <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed border-red-300 rounded-lg bg-red-50">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-2" />
            <p className="text-red-600 font-medium">Erro na conexão</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
        <img 
          src={qrCode} 
          alt="QR Code WhatsApp" 
          className="w-64 h-64 object-contain"
        />
      </div>
    );
  };

  const renderActionButtons = () => {
    if (status === 'connected') {
      return (
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="w-full"
        >
          Fechar
        </Button>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex gap-2">
          <Button 
            onClick={onRefresh}
            disabled={isLoading || attempts >= maxAttempts}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Tentar Novamente
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      );
    }

    if (status === 'active') {
      return (
        <div className="flex gap-2">
          <Button 
            onClick={onRefresh}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Gerar Novo QR
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      );
    }

    return (
      <Button 
        variant="outline" 
        onClick={onCancel}
        className="w-full"
      >
        Cancelar
      </Button>
    );
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      {renderStatusMessage()}
      
      {renderQRCode()}
      
      {attempts > 0 && status !== 'connected' && (
        <div className="text-xs text-gray-500">
          Tentativa {attempts}/{maxAttempts}
        </div>
      )}
      
      {renderActionButtons()}
    </div>
  );
};