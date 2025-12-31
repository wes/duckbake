import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { EditorView } from "@codemirror/view";
import { catppuccinMocha, catppuccinLatte } from "@catppuccin/codemirror";
import { Play, Clock, AlertCircle, Save, FileCode, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataGrid } from "@/components/database";
import { useAppStore, useProjectStore } from "@/stores";
import {
  executeQuery,
  listSavedQueries,
  saveQuery,
  updateSavedQuery,
  deleteSavedQuery,
  getProjectContext,
} from "@/lib/tauri";
import type { QueryResult, SavedQuery } from "@/types";

interface SqlEditorProps {
  projectId: string;
}

export function SqlEditor({ projectId }: SqlEditorProps) {
  // Use store for query persistence across tab navigation
  const storeQuery = useProjectStore((s) => s.getQuery(projectId));
  const setStoreQuery = useProjectStore((s) => s.setQuery);
  const [query, setLocalQuery] = useState(storeQuery);
  const [result, setResult] = useState<QueryResult | null>(null);

  // Sync local state with store
  const setQuery = useCallback(
    (value: string) => {
      setLocalQuery(value);
      setStoreQuery(projectId, value);
    },
    [projectId, setStoreQuery]
  );

  // Initialize from store when projectId changes
  useEffect(() => {
    setLocalQuery(storeQuery);
  }, [projectId, storeQuery]);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newQueryName, setNewQueryName] = useState("");
  const pendingSql = useAppStore((s) => s.pendingSql);
  const setPendingSql = useAppStore((s) => s.setPendingSql);
  const pendingExecuted = useRef(false);
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(Math.max(e.clientX - 256, 150), 400);
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Load saved queries
  const { data: savedQueries = [], refetch: refetchQueries } = useQuery({
    queryKey: ["saved-queries", projectId],
    queryFn: () => listSavedQueries(projectId),
  });

  // Load project context for autocomplete
  const { data: projectContext } = useQuery({
    queryKey: ["project-context", projectId],
    queryFn: () => getProjectContext(projectId),
    staleTime: 30000,
  });

  // Build schema for CodeMirror SQL autocomplete
  const sqlSchema = useMemo(() => {
    if (!projectContext?.tables) return {};
    const schema: Record<string, string[]> = {};
    for (const table of projectContext.tables) {
      schema[table.name] = table.columns.map((col) => col.name);
    }
    return schema;
  }, [projectContext]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const transparentTheme = useMemo(
    () =>
      EditorView.theme({
        "&": { backgroundColor: "transparent !important" },
        "&.cm-editor": { backgroundColor: "transparent !important" },
        ".cm-scroller": { backgroundColor: "transparent !important" },
        ".cm-gutters": { backgroundColor: "transparent !important", borderRight: "none" },
        ".cm-content": { backgroundColor: "transparent !important" },
        ".cm-activeLine": { backgroundColor: "transparent !important" },
        ".cm-activeLineGutter": { backgroundColor: "transparent !important" },
      }),
    []
  );

  const executeMutation = useMutation({
    mutationFn: (sql: string) => executeQuery(projectId, sql),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ name, sql }: { name: string; sql: string }) =>
      saveQuery(projectId, name, sql),
    onSuccess: (saved) => {
      setCurrentQueryId(saved.id);
      setShowSaveInput(false);
      setNewQueryName("");
      refetchQueries();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, sql }: { id: string; name?: string; sql?: string }) =>
      updateSavedQuery(projectId, id, name, sql),
    onSuccess: () => {
      setEditingId(null);
      refetchQueries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSavedQuery(projectId, id),
    onSuccess: (_, id) => {
      if (currentQueryId === id) {
        setCurrentQueryId(null);
      }
      refetchQueries();
    },
  });

  // Handle pending SQL from chat (open in editor and auto-run)
  useEffect(() => {
    if (pendingSql && !pendingExecuted.current) {
      setQuery(pendingSql);
      setCurrentQueryId(null);
      pendingExecuted.current = true;
      const timer = setTimeout(() => {
        executeMutation.mutate(pendingSql);
        setPendingSql(null);
        pendingExecuted.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingSql, setPendingSql, executeMutation]);

  const handleExecute = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed) {
      executeMutation.mutate(trimmed);
    }
  }, [query, executeMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleExecute();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (currentQueryId) {
          updateMutation.mutate({ id: currentQueryId, sql: query });
        } else {
          setShowSaveInput(true);
        }
      }
    },
    [handleExecute, currentQueryId, query, updateMutation]
  );

  const handleSaveNew = () => {
    const name = newQueryName.trim();
    if (name && query.trim()) {
      saveMutation.mutate({ name, sql: query });
    }
  };

  const handleLoadQuery = (saved: SavedQuery) => {
    setQuery(saved.sql);
    setCurrentQueryId(saved.id);
    setResult(null);
  };

  const handleStartRename = (saved: SavedQuery) => {
    setEditingId(saved.id);
    setEditingName(saved.name);
  };

  const handleFinishRename = () => {
    if (editingId && editingName.trim()) {
      updateMutation.mutate({ id: editingId, name: editingName.trim() });
    } else {
      setEditingId(null);
    }
  };

  const columns = result?.columns || [];
  const rows = (result?.rows || []) as Record<string, unknown>[];

  return (
    <div className="h-full flex overflow-hidden">
      {/* Saved Queries Sidebar */}
      <div
        className="border-r flex flex-col shrink-0"
        style={{ width: sidebarWidth }}
      >
        <div className="p-3 border-b">
          <h3 className="font-medium text-sm">Saved Queries</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {savedQueries.map((saved) => (
              <div
                key={saved.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                  currentQueryId === saved.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={() => handleLoadQuery(saved)}
              >
                <FileCode className="h-4 w-4 shrink-0" />
                {editingId === saved.id ? (
                  <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-6 text-xs px-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFinishRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      className="p-1 hover:text-primary"
                      onClick={handleFinishRename}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      className="p-1 hover:text-muted-foreground"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 truncate">{saved.name}</span>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                      <button
                        className="p-1 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(saved);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        className="p-1 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(saved.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {savedQueries.length === 0 && (
              <div className="text-center text-muted-foreground text-xs py-8">
                No saved queries yet
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      {/* Resize handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors shrink-0"
        onMouseDown={startResizing}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Editor */}
        <div className="border-b relative" onKeyDown={handleKeyDown}>
          <CodeMirror
            value={query}
            height="150px"
            extensions={[sql({ schema: sqlSchema }), isDark ? catppuccinMocha : catppuccinLatte, transparentTheme]}
            onChange={(value) => {
              setQuery(value);
            }}
            className="text-sm [&]:bg-transparent [&_*]:!bg-transparent"
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              highlightActiveLine: true,
              foldGutter: false,
            }}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            {showSaveInput ? (
              <div className="flex items-center gap-1 bg-background border rounded-md px-2 py-1 shadow-md">
                <Input
                  value={newQueryName}
                  onChange={(e) => setNewQueryName(e.target.value)}
                  placeholder="Query name..."
                  className="h-6 w-32 text-xs border-0 p-0 focus-visible:ring-0"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveNew();
                    if (e.key === "Escape") {
                      setShowSaveInput(false);
                      setNewQueryName("");
                    }
                  }}
                />
                <button
                  className="p-1 hover:text-primary"
                  onClick={handleSaveNew}
                  disabled={!newQueryName.trim()}
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 hover:text-muted-foreground"
                  onClick={() => {
                    setShowSaveInput(false);
                    setNewQueryName("");
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="outline"
                className="rounded-full h-8 w-8 shadow-md"
                onClick={() => {
                  if (currentQueryId) {
                    updateMutation.mutate({ id: currentQueryId, sql: query });
                  } else {
                    setShowSaveInput(true);
                  }
                }}
                disabled={!query.trim()}
                title={currentQueryId ? "Update query (Cmd+S)" : "Save query (Cmd+S)"}
              >
                <Save className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              className="rounded-full h-8 w-8 shadow-md"
              onClick={handleExecute}
              disabled={executeMutation.isPending || !query.trim()}
            >
              {executeMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {executeMutation.isError && (
            <div className="p-3 bg-destructive/10 text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="text-sm">
                {executeMutation.error instanceof Error
                  ? executeMutation.error.message
                  : String(executeMutation.error)}
              </span>
            </div>
          )}

          {result && (
            <>
              <div className="p-2 bg-muted/30 border-b flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {result.executionTimeMs}ms
                </span>
                <span>{result.rowCount} rows</span>
                <span>{result.columns.length} columns</span>
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <DataGrid
                  columns={columns}
                  rows={rows}
                  isLoading={executeMutation.isPending}
                />
              </div>
            </>
          )}

          {!result && !executeMutation.isError && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Run a query to see results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
