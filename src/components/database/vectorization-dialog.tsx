import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getTextColumns,
  getVectorizationStatus,
  vectorizeTable,
  removeVectorization,
} from "@/lib/tauri";
import type { VectorizationProgress } from "@/types";

interface VectorizationDialogProps {
  projectId: string;
  tableName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VectorizationDialog({
  projectId,
  tableName,
  open,
  onOpenChange,
}: VectorizationDialogProps) {
  const queryClient = useQueryClient();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [progress, setProgress] = useState<VectorizationProgress | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["vectorization-status", projectId, tableName],
    queryFn: () => getVectorizationStatus(projectId, tableName),
    enabled: open && !!tableName,
  });

  const { data: textColumns = [], isLoading: columnsLoading } = useQuery({
    queryKey: ["text-columns", projectId, tableName],
    queryFn: () => getTextColumns(projectId, tableName),
    enabled: open && !!tableName,
  });

  // Pre-select all text columns
  useEffect(() => {
    if (textColumns.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(textColumns);
    }
  }, [textColumns, selectedColumns.length]);

  // Listen for progress updates
  useEffect(() => {
    if (!open) return;

    const unsubscribe = listen<VectorizationProgress>(
      "vectorization-progress",
      (event) => {
        setProgress(event.payload);
        if (event.payload.status === "completed") {
          queryClient.invalidateQueries({
            queryKey: ["vectorization-status", projectId, tableName],
          });
          queryClient.invalidateQueries({ queryKey: ["tables", projectId] });
        }
      }
    );

    return () => {
      unsubscribe.then((fn) => fn());
    };
  }, [open, projectId, tableName, queryClient]);

  const [mutationError, setMutationError] = useState<string | null>(null);

  const vectorizeMutation = useMutation({
    mutationFn: () => vectorizeTable(projectId, tableName, selectedColumns),
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({
        queryKey: ["vectorization-status", projectId, tableName],
      });
      queryClient.invalidateQueries({ queryKey: ["tables", projectId] });
    },
    onError: (error: Error) => {
      setMutationError(error.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => removeVectorization(projectId, tableName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["vectorization-status", projectId, tableName],
      });
      queryClient.invalidateQueries({ queryKey: ["tables", projectId] });
      setProgress(null);
    },
  });

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column]
    );
  };

  const isProcessing =
    vectorizeMutation.isPending ||
    (progress?.status === "processing" && progress.tableName === tableName);

  const handleClose = () => {
    if (!isProcessing) {
      setProgress(null);
      setMutationError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Vectorize Table
          </DialogTitle>
          <DialogDescription>
            Enable semantic search for "{tableName}" by generating embeddings.
          </DialogDescription>
        </DialogHeader>

        {statusLoading || columnsLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {status?.isVectorized ? (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  Vectorized
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Embeddings: {status.embeddingCount.toLocaleString()}</p>
                  <p>Model: {status.embeddingModel || "unknown"}</p>
                  <p>Columns: {status.vectorizedColumns.join(", ")}</p>
                </div>
              </div>
            ) : (
              <>
                {textColumns.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No text columns found in this table.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      Select columns to vectorize:
                    </p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {textColumns.map((column) => (
                        <label
                          key={column}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(column)}
                            onChange={() => toggleColumn(column)}
                            className="rounded"
                          />
                          <span className="text-sm font-mono">{column}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requires the <code className="bg-muted px-1 py-0.5 rounded">nomic-embed-text</code> Ollama model
                    </p>
                  </div>
                )}
              </>
            )}

            {isProcessing && progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing...</span>
                  <span>
                    {progress.processedRows.toLocaleString()} /{" "}
                    {progress.totalRows.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width: `${
                        progress.totalRows > 0
                          ? (progress.processedRows / progress.totalRows) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {(progress?.status === "error" || mutationError) && (
              <div className="text-sm text-destructive space-y-1">
                <p>{progress?.error || mutationError}</p>
                {(progress?.error || mutationError)?.includes("nomic-embed-text") && (
                  <p className="text-xs text-muted-foreground">
                    Run: <code className="bg-muted px-1 py-0.5 rounded">ollama pull nomic-embed-text</code>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {status?.isVectorized ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => removeMutation.mutate()}
                disabled={removeMutation.isPending}
              >
                {removeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Remove Vectorization
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => vectorizeMutation.mutate()}
                disabled={
                  isProcessing ||
                  selectedColumns.length === 0 ||
                  textColumns.length === 0
                }
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {isProcessing ? "Vectorizing..." : "Vectorize"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
