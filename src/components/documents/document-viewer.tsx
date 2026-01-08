import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import {
  FileText,
  Sparkles,
  Trash2,
  Loader2,
  FileType,
  Hash,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDocument, deleteDocument, vectorizeDocument } from "@/lib/tauri";
import { useDocumentStore } from "@/stores";
import type { DocumentVectorizationProgress } from "@/types";

interface DocumentViewerProps {
  projectId: string;
  documentId: string;
}

export function DocumentViewer({ projectId, documentId }: DocumentViewerProps) {
  const queryClient = useQueryClient();
  const { selectDocument, setProgress, isVectorizing, getProgress } =
    useDocumentStore();
  const [localProgress, setLocalProgress] =
    useState<DocumentVectorizationProgress | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: document, isLoading } = useQuery({
    queryKey: ["document", projectId, documentId],
    queryFn: () => getDocument(projectId, documentId),
  });

  // Listen for vectorization progress
  useEffect(() => {
    const unsubscribe = listen<DocumentVectorizationProgress>(
      "document-vectorization-progress",
      (event) => {
        if (event.payload.documentId === documentId) {
          setLocalProgress(event.payload);
          setProgress(documentId, event.payload);
          if (event.payload.status === "completed") {
            queryClient.invalidateQueries({
              queryKey: ["document", projectId, documentId],
            });
            queryClient.invalidateQueries({
              queryKey: ["documents", projectId],
            });
          }
        }
      }
    );

    return () => {
      unsubscribe.then((fn) => fn());
    };
  }, [documentId, projectId, queryClient, setProgress]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(projectId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
      selectDocument(null);
    },
  });

  const vectorizeMutation = useMutation({
    mutationFn: () => vectorizeDocument(projectId, documentId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Document not found</p>
      </div>
    );
  }

  const vectorizing = isVectorizing(documentId);
  const progress = getProgress(documentId) || localProgress;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{document.filename}</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <FileType className="h-3 w-3" />
                {document.fileType.toUpperCase()}
              </span>
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {document.wordCount.toLocaleString()} words
              </span>
              {document.pageCount && (
                <span className="flex items-center gap-1">
                  {document.pageCount} pages
                </span>
              )}
              {document.author && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {document.author}
                </span>
              )}
              {document.creationDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {document.creationDate}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!document.isVectorized && !vectorizing && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => vectorizeMutation.mutate()}
              disabled={vectorizeMutation.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Vectorize
            </Button>
          )}
          {vectorizing && progress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {progress.processedChunks}/{progress.totalChunks} chunks
              </span>
            </div>
          )}
          {document.isVectorized && !vectorizing && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <Sparkles className="h-4 w-4" />
              <span>Vectorized</span>
            </div>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Document</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{document.filename}"? This
                  action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    deleteMutation.mutate();
                    setDeleteDialogOpen(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Title if available */}
      {document.title && (
        <div className="px-4 py-2 border-b bg-muted/50">
          <h3 className="text-lg font-medium">{document.title}</h3>
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {document.content}
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
}
