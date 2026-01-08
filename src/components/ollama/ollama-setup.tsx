import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import {
  Download,
  CheckCircle2,
  Loader2,
  ExternalLink,
  RefreshCw,
  Cpu,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  checkOllamaStatus,
  listOllamaModels,
  pullOllamaModel,
} from "@/lib/tauri";
import type { OllamaPullProgress } from "@/types";

// Recommended models for DuckBake
const RECOMMENDED_MODELS = {
  embedding: {
    name: "nomic-embed-text",
    description: "Fast, high-quality embeddings for semantic search",
    size: "274 MB",
    required: true,
  },
  chat: [
    {
      name: "llama3.2:3b",
      description: "Fast and capable for most tasks",
      size: "2.0 GB",
      recommended: true,
    },
    {
      name: "llama3.2:1b",
      description: "Lightweight, good for quick responses",
      size: "1.3 GB",
      recommended: false,
    },
    {
      name: "mistral:7b",
      description: "Excellent reasoning and analysis",
      size: "4.1 GB",
      recommended: false,
    },
    {
      name: "qwen2.5:7b",
      description: "Strong multilingual support",
      size: "4.7 GB",
      recommended: false,
    },
  ],
};

interface OllamaSetupProps {
  onComplete?: () => void;
  onManageModels?: () => void;
}

type SetupStep = "check" | "install" | "models" | "complete";

export function OllamaSetup({ onComplete, onManageModels }: OllamaSetupProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<SetupStep>("check");
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<{
    status: string;
    percent: number;
  } | null>(null);

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["ollama-status"],
    queryFn: checkOllamaStatus,
    refetchInterval: step === "install" ? 3000 : false,
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

  // Determine step based on status
  useEffect(() => {
    if (!status) return;

    if (!status.connected) {
      setStep("install");
    } else {
      // Check if we have the required embedding model
      const hasEmbedding = models.some((m) =>
        m.name.startsWith(RECOMMENDED_MODELS.embedding.name)
      );
      const hasChatModel = models.some(
        (m) =>
          !m.name.includes("embed") &&
          !m.name.includes("nomic") &&
          !m.name.includes("bge")
      );

      if (!hasEmbedding || !hasChatModel) {
        setStep("models");
      } else {
        setStep("complete");
      }
    }
  }, [status, models]);

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

  const hasModel = (name: string) =>
    models.some((m) => m.name.startsWith(name.split(":")[0]));

  // Install Ollama step
  if (step === "install") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-lg mx-auto">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
          <Cpu className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Install Ollama</h2>
        <p className="text-muted-foreground mb-6">
          DuckBake uses Ollama to run AI models locally on your machine. It's
          free, private, and runs entirely offline.
        </p>

        <div className="w-full space-y-4 mb-6">
          <a
            href="https://ollama.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">Download Ollama</div>
                <div className="text-sm text-muted-foreground">
                  Available for macOS, Windows, and Linux
                </div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          After installing, make sure Ollama is running.
        </div>

        <Button
          variant="outline"
          onClick={() => refetchStatus()}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Check Again
        </Button>

        {status?.connected && (
          <div className="mt-4 flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Connected to Ollama {status.version}</span>
          </div>
        )}
      </div>
    );
  }

  // Model setup step
  if (step === "models") {
    const hasEmbedding = hasModel(RECOMMENDED_MODELS.embedding.name);
    const installedChatModels = RECOMMENDED_MODELS.chat.filter((m) =>
      hasModel(m.name)
    );

    return (
      <div className="flex flex-col h-full p-6 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Setup AI Models</h2>
          <p className="text-muted-foreground">
            Download the models needed for chat and semantic search.
          </p>
        </div>

        {/* Embedding Model */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Embedding Model (Required)
          </h3>
          <div
            className={`p-4 border rounded-lg ${
              hasEmbedding ? "border-green-500/50 bg-green-500/5" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {hasEmbedding ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                )}
                <div>
                  <div className="font-medium">
                    {RECOMMENDED_MODELS.embedding.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {RECOMMENDED_MODELS.embedding.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {RECOMMENDED_MODELS.embedding.size}
                </span>
                {!hasEmbedding && (
                  <Button
                    size="sm"
                    onClick={() =>
                      pullMutation.mutate(RECOMMENDED_MODELS.embedding.name)
                    }
                    disabled={pullingModel !== null}
                  >
                    {pullingModel === RECOMMENDED_MODELS.embedding.name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            {pullingModel === RECOMMENDED_MODELS.embedding.name &&
              pullProgress && (
                <div className="mt-3 space-y-2">
                  <Progress value={pullProgress.percent} />
                  <div className="text-xs text-muted-foreground">
                    {pullProgress.status}
                    {pullProgress.percent > 0 && ` (${pullProgress.percent}%)`}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Chat Models */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat Model (Choose at least one)
          </h3>
          <div className="space-y-2">
            {RECOMMENDED_MODELS.chat.map((model) => {
              const installed = hasModel(model.name);
              const isPulling = pullingModel === model.name;

              return (
                <div
                  key={model.name}
                  className={`p-4 border rounded-lg ${
                    installed ? "border-green-500/50 bg-green-500/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {installed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {model.name}
                          {model.recommended && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {model.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {model.size}
                      </span>
                      {!installed && (
                        <Button
                          size="sm"
                          variant={model.recommended ? "default" : "outline"}
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
                  </div>
                  {isPulling && pullProgress && (
                    <div className="mt-3 space-y-2">
                      <Progress value={pullProgress.percent} />
                      <div className="text-xs text-muted-foreground">
                        {pullProgress.status}
                        {pullProgress.percent > 0 &&
                          ` (${pullProgress.percent}%)`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t mt-6">
          <Button variant="ghost" onClick={onManageModels} className="gap-2">
            <Settings2 className="h-4 w-4" />
            Manage All Models
          </Button>
          <Button
            onClick={onComplete}
            disabled={!hasEmbedding || installedChatModels.length === 0}
            className="gap-2"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Complete step
  if (step === "complete") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-lg mx-auto">
        <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Ready to Go!</h2>
        <p className="text-muted-foreground mb-6">
          Ollama is connected and you have the required models installed. You
          can now use AI-powered features in DuckBake.
        </p>

        <div className="w-full space-y-3 mb-6">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm">
              Connected to Ollama {status?.version}
            </span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm">
              {models.length} model{models.length !== 1 ? "s" : ""} available
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onManageModels}>
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Models
          </Button>
          <Button onClick={onComplete}>
            Start Chatting
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Loading/check step
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
      <p className="text-muted-foreground">Checking Ollama status...</p>
    </div>
  );
}
