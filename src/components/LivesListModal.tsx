import { ConfirmationModal } from '@/components/ConfirmationModal';
import { CreateLiveModal } from '@/components/CreateLiveModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLives } from '@/hooks/useLives';
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface LivesListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  captações: any[];
  currentInstance: any;
  onLivesUpdated: () => void;
}

export const LivesListModal = ({ open, onOpenChange, captações, currentInstance, onLivesUpdated }: LivesListModalProps) => {
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
      // Error handling removed for production
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Captações</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {captações.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma live encontrada para esta instância.
            </div>
          ) : (
            <div className="grid gap-4">
              {captações.map((live) => (
                <div key={live.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{live.name}</h3>
                      <Badge variant={live.status === 'active' ? 'default' : 'secondary'}>
                        {live.status === 'active' ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditLive(live)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteLive(live)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Data:</span> {new Date(live.live_date).toLocaleDateString('pt-BR')}
                    </div>
                    <div>
                      <span className="font-medium">Meta Vendas:</span> {live.sales_goal}
                    </div>
                    <div>
                      <span className="font-medium">Meta Leads:</span> {live.leads_goal}
                    </div>
                    <div>
                      <span className="font-medium">Orçamento:</span> R$ {live.ad_budget}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Edit Modal */}
      <CreateLiveModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        editingLive={editingLive}
        onLiveCreated={() => {
          setShowEditModal(false)
          setEditingLive(null)
          onLivesUpdated()
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir a live "${liveToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDeleteLive}
        onCancel={() => setShowDeleteModal(false)}
        isLoading={isLoading}
      />
    </Dialog>
  )
}