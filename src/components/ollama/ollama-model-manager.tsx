import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import {
  Download,
  Trash2,
  Loader2,
  HardDrive,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  checkOllamaStatus,
  listOllamaModels,
  pullOllamaModel,
  deleteOllamaModel,
} from "@/lib/tauri";
import type { OllamaModel, OllamaPullProgress } from "@/types";

// Popular models that can be pulled
const POPULAR_MODELS = [
  // Chat models
  { name: "llama3.2:3b", category: "chat", size: "2.0 GB", description: "Fast and capable" },
  { name: "llama3.2:1b", category: "chat", size: "1.3 GB", description: "Lightweight" },
  { name: "llama3.1:8b", category: "chat", size: "4.7 GB", description: "More capable, larger" },
  { name: "mistral:7b", category: "chat", size: "4.1 GB", description: "Excellent reasoning" },
  { name: "qwen2.5:7b", category: "chat", size: "4.7 GB", description: "Strong multilingual" },
  { name: "qwen2.5:3b", category: "chat", size: "1.9 GB", description: "Fast multilingual" },
  { name: "gemma2:9b", category: "chat", size: "5.4 GB", description: "Google's latest" },
  { name: "phi3:mini", category: "chat", size: "2.3 GB", description: "Microsoft's efficient model" },
  { name: "codellama:7b", category: "chat", size: "3.8 GB", description: "Code-focused" },
  { name: "deepseek-coder:6.7b", category: "chat", size: "3.8 GB", description: "Code generation" },
  // Embedding models
  { name: "nomic-embed-text", category: "embedding", size: "274 MB", description: "Fast embeddings" },
  { name: "mxbai-embed-large", category: "embedding", size: "670 MB", description: "High quality embeddings" },
  { name: "all-minilm", category: "embedding", size: "46 MB", description: "Tiny, fast embeddings" },
];

interface OllamaModelManagerProps {
  onBack?: () => void;
}

export function OllamaModelManager({ onBack }: OllamaModelManagerProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<{
    status: string;
    percent: number;
  } | null>(null);
  const [deleteModel, setDeleteModel] = useState<OllamaModel | null>(null);
  const [customModel, setCustomModel] = useState("");

  const { data: status } = useQuery({
    queryKey: ["ollama-status"],
    queryFn: checkOllamaStatus,
  });

  const { data: models = [], refetch: refetchModels } = useQuery({
    queryKey: ["ollama-models"],
    queryFn: listOllamaModels,
    enabled: status?.connected,
  });

  // Listen for pull progress events
  useEffect(() => {
    const unlistenPromise = listen<OllamaPullProgress>(
      "ollama-pull-progress",
      (event) => {
        const progress = event.payload;
        let percent = 0;
        if (progress.total && progress.completed) {
          percent = Math.round((progress.completed / progress.total) * 100);
        }
        setPullProgress({
          status: progress.status,
          percent,
        });
      }
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const pullMutation = useMutation({
    mutationFn: async (modelName: string) => {
      setPullingModel(modelName);
      setPullProgress({ status: "Starting download...", percent: 0 });
      await pullOllamaModel(modelName);
    },
    onSuccess: () => {
      setPullingModel(null);
      setPullProgress(null);
      refetchModels();
      queryClient.invalidateQueries({ queryKey: ["ollama-models"] });
    },
    onError: () => {
      setPullingModel(null);
      setPullProgress(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (modelName: string) => {
      await deleteOllamaModel(modelName);
    },
    onSuccess: () => {
      refetchModels();
      queryClient.invalidateQueries({ queryKey: ["ollama-models"] });
      setDeleteModel(null);
    },
  });

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const totalSize = models.reduce((sum, m) => sum + m.size, 0);

  const hasModel = (name: string) =>
    models.some((m) => m.name === name || m.name.startsWith(name.split(":")[0] + ":"));

  const isEmbeddingModel = (name: string) => {
    const lower = name.toLowerCase();
    return (
      lower.includes("embed") ||
      lower.includes("nomic") ||
      lower.includes("minilm") ||
      lower.includes("bge") ||
      lower.includes("e5-") ||
      lower.includes("gte-")
    );
  };

  const filteredPopularModels = POPULAR_MODELS.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePullCustom = () => {
    if (customModel.trim()) {
      pullMutation.mutate(customModel.trim());
      setCustomModel("");
    }
  };

  if (!status?.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Ollama Not Connected</h3>
        <p className="text-sm text-muted-foreground">
          Make sure Ollama is running to manage models.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h2 className="text-lg font-semibold">Model Manager</h2>
              <p className="text-sm text-muted-foreground">
                {models.length} models installed ({formatSize(totalSize)})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <span>Ollama {status.version}</span>
          </div>
        </div>

        {/* Pull custom model */}
        <div className="flex gap-2">
          <Input
            placeholder="Pull a model (e.g., llama3.2:3b)"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePullCustom();
            }}
          />
          <Button
            onClick={handlePullCustom}
            disabled={!customModel.trim() || pullingModel !== null}
          >
            {pullingModel && customModel === pullingModel ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Pull progress */}
        {pullingModel && pullProgress && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Downloading {pullingModel}</span>
              <span className="text-muted-foreground">
                {pullProgress.percent}%
              </span>
            </div>
            <Progress value={pullProgress.percent} />
            <div className="text-xs text-muted-foreground">
              {pullProgress.status}
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Installed Models */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Installed Models
            </h3>
            {models.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No models installed yet
              </div>
            ) : (
              <div className="space-y-2">
                {models.map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {isEmbeddingModel(model.name) ? (
                        <Sparkles className="h-5 w-5 text-primary" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatSize(model.size)} • Modified{" "}
                          {new Date(model.modifiedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteModel(model)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Models */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Popular Models
              </h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  className="pl-9 h-9 w-48"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              {filteredPopularModels.map((model) => {
                const installed = hasModel(model.name);
                const isPulling = pullingModel === model.name;

                return (
                  <div
                    key={model.name}
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      installed ? "border-green-500/30 bg-green-500/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {model.category === "embedding" ? (
                        <Sparkles className="h-5 w-5 text-primary" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {model.name}
                          {installed && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {model.description} • {model.size}
                        </div>
                      </div>
                    </div>
                    {!installed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pullMutation.mutate(model.name)}
                        disabled={pullingModel !== null}
                      >
                        {isPulling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteModel} onOpenChange={() => setDeleteModel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteModel?.name}"? This will
              free up {deleteModel && formatSize(deleteModel.size)} of disk
              space.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModel(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteModel && deleteMutation.mutate(deleteModel.name)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
