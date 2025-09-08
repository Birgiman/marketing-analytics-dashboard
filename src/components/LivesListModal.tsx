import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Video } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateLiveModal } from '@/components/CreateLiveModal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { useLives } from '@/hooks/useLives';
import { useState } from 'react';

interface LivesListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lives: any[];
  currentInstance: any;
  onLivesUpdated: () => void;
}

export const LivesListModal = ({ open, onOpenChange, lives, currentInstance, onLivesUpdated }: LivesListModalProps) => {
  const { softDeleteLive, isLoading } = useLives()
  const [editingLive, setEditingLive] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [liveToDelete, setLiveToDelete] = useState<any>(null)

  const handleEditLive = (live: any) => {
    setEditingLive(live)
    setShowEditModal(true)
  }

  const handleDeleteLive = (live: any) => {
    setLiveToDelete(live)
    setShowDeleteModal(true)
  }

  const confirmDeleteLive = async () => {
    if (!liveToDelete) return

    try {
      await softDeleteLive(liveToDelete.id)
      setShowDeleteModal(false)
      setLiveToDelete(null)
      onLivesUpdated()
    } catch (error) {
      console.error('Error deleting live:', error)
    }
  }

  const handleLiveUpdated = () => {
    setShowEditModal(false)
    setEditingLive(null)
    onLivesUpdated()
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Todas as Lives</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {lives.length > 0 ? (
            <div className="border rounded-lg">
              <div className="grid grid-cols-7 gap-4 p-4 bg-muted/50 border-b">
                <div className="text-sm font-medium">Nome da Live</div>
                <div className="text-sm font-medium">Data</div>
                <div className="text-sm font-medium">Status</div>
                <div className="text-sm font-medium">Pessoas ao vivo</div>
                <div className="text-sm font-medium">Vendas</div>
                <div className="text-sm font-medium">Receita</div>
                <div className="text-sm font-medium">Ações</div>
              </div>
              
              {lives.map((live) => (
                <div key={live.id} className="grid grid-cols-7 gap-4 p-4 border-b items-center">
                  <div className="font-medium">{live.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {live.live_date ? new Date(live.live_date).toLocaleDateString('pt-BR') : 'Não definida'}
                  </div>
                  <div>
                    <Badge variant="secondary">Criada</Badge>
                  </div>
                  <div className="text-sm">
                    {live.live_groups?.reduce((sum: number, group: any) => sum + (group.group_size || 0), 0) || 0}
                  </div>
                  <div className="text-sm text-red-500">
                    45 (mockado)
                  </div>
                  <div className="text-sm text-red-500">
                    R$ 2.850 (mockado)
                  </div>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEditLive(live)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteLive(live)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Video className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Você ainda não possui lives cadastradas</p>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Edit Live Modal */}
      <CreateLiveModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        currentInstance={currentInstance}
        onLiveCreated={handleLiveUpdated}
        editingLive={editingLive}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Confirmar Exclusão"
        description={
          liveToDelete 
            ? `Você tem certeza que deseja excluir a live "${liveToDelete.name}" com ${liveToDelete.live_groups?.length || 0} grupo(s) e ${liveToDelete.live_groups?.reduce((sum: number, group: any) => sum + (group.group_size || 0), 0) || 0} pessoas?`
            : 'Você tem certeza que deseja excluir esta live?'
        }
        onConfirm={confirmDeleteLive}
        onCancel={() => {
          setShowDeleteModal(false)
          setLiveToDelete(null)
        }}
        isLoading={isLoading}
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        variant="destructive"
      />
    </Dialog>
  );
};