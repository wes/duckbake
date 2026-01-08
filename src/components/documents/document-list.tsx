import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Sparkles, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarItem } from "@/components/ui/sidebar-item";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getDocuments, deleteDocument } from "@/lib/tauri";
import { useDocumentStore } from "@/stores";
import type { DocumentInfo } from "@/types";

interface DocumentListProps {
  projectId: string;
  onUploadClick: () => void;
  onSelectDocument?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ projectId, onUploadClick, onSelectDocument }: DocumentListProps) {
  const queryClient = useQueryClient();
  const { selectedDocument, selectDocument, isVectorizing } = useDocumentStore();
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleteDocName, setDeleteDocName] = useState<string>("");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => getDocuments(projectId),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return deleteDocument(projectId, documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
      if (selectedDocument === deleteDocId) {
        selectDocument(null);
      }
      setDeleteDocId(null);
      setDeleteDocName("");
    },
  });

  if (isLoading) {
    return (
      <div>
        <h3 className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Documents
        </h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-foreground"
        onClick={onUploadClick}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Document
      </Button>
    );
  }

  return (
    <>
      <h3 className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Documents
      </h3>
      <div className="space-y-0">
        {documents.map((doc: DocumentInfo) => {
          const vectorizing = isVectorizing(doc.id);
          return (
            <ContextMenu key={doc.id}>
              <ContextMenuTrigger asChild>
                <div className="w-full overflow-hidden">
                  <SidebarItem
                    icon={<FileText className="h-4 w-4" />}
                    name={doc.filename}
                    selected={selectedDocument === doc.id}
                    onClick={() => {
                      selectDocument(doc.id);
                      onSelectDocument?.();
                    }}
                    statusElement={
                      vectorizing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : doc.isVectorized ? (
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <span className="text-xs opacity-60">
                          {formatFileSize(doc.fileSize)}
                        </span>
                      )
                    }
                  />
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    setDeleteDocId(doc.id);
                    setDeleteDocName(doc.filename);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Document
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={onUploadClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      {/* Delete Document Dialog */}
      <Dialog open={!!deleteDocId} onOpenChange={(open) => !open && setDeleteDocId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDocName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDocId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDocId && deleteDocumentMutation.mutate(deleteDocId)}
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
