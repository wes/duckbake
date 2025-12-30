import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, AlertCircle, Loader2, Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "./chat-input";
import { DataVisualization, type VisualizationConfig, type VizType } from "./data-visualization";
import { useChatStore } from "@/stores";
import {
  listOllamaModels,
  checkOllamaStatus,
  sendChatMessage,
  getProjectContext,
  executeQuery,
  getTables,
  semanticSearch,
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  addMessage,
} from "@/lib/tauri";
import type { ChatMessage, ProjectContext, QueryResult, SemanticSearchResult } from "@/types";

interface ChatPanelProps {
  projectId: string;
}

// Parsed query block from AI response
interface QueryBlock {
  sql: string;
  viz: VizType;
  xKey?: string;
  yKey?: string;
}

// Extract duckbake query blocks from content
function extractQueryBlocks(content: string): { blocks: QueryBlock[]; cleanContent: string } {
  const regex = /```duckbake\n([\s\S]*?)```/gi;
  const blocks: QueryBlock[] = [];
  let cleanContent = content;

  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      if (json.sql) {
        blocks.push({
          sql: json.sql,
          viz: json.viz || "table",
          xKey: json.xKey,
          yKey: json.yKey,
        });
      }
    } catch {
      // Invalid JSON, skip
    }
    // Remove the block from display content
    cleanContent = cleanContent.replace(match[0], "");
  }

  // Clean up extra whitespace
  cleanContent = cleanContent.replace(/\n{3,}/g, "\n\n").trim();

  return { blocks, cleanContent };
}

// Build context string from project data
function buildContextString(
  context: ProjectContext,
  semanticResults?: Map<string, SemanticSearchResult[]>
): string {
  if (context.tables.length === 0) {
    return "No tables in this project yet.";
  }

  let str = "DATABASE SCHEMA:\n\n";

  for (const table of context.tables) {
    str += `TABLE: ${table.name} (${table.rowCount.toLocaleString()} rows)\n`;
    str += "Columns:\n";
    for (const col of table.columns) {
      str += `  - ${col.name}: ${col.dataType}${col.nullable ? "" : " NOT NULL"}${col.isPrimaryKey ? " PRIMARY KEY" : ""}\n`;
    }

    // Add semantic search results if available for this table
    const tableSemanticResults = semanticResults?.get(table.name);
    if (tableSemanticResults && tableSemanticResults.length > 0) {
      str += "Relevant data (semantic search):\n";
      for (const result of tableSemanticResults) {
        str += `  - ${result.content} (similarity: ${result.similarity.toFixed(3)})\n`;
      }
    } else if (table.sampleRows && table.sampleRows.length > 0) {
      str += "Sample data:\n";
      str += "```json\n" + JSON.stringify(table.sampleRows, null, 2) + "\n```\n";
    }
    str += "\n";
  }

  return str;
}

export function ChatPanel({ projectId }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const queryClient = useQueryClient();

  const {
    currentConversationId,
    messages,
    isStreaming,
    streamingContent,
    conversations,
    setConversations,
    setCurrentConversation,
    addConversation,
    removeConversation,
    addMessage: addMessageToStore,
    setMessages,
    startStreaming,
    appendToStreaming,
    finalizeStreaming,
  } = useChatStore();

  const { data: ollamaStatus } = useQuery({
    queryKey: ["ollama-status"],
    queryFn: checkOllamaStatus,
    refetchInterval: 10000,
  });

  const { data: models = [] } = useQuery({
    queryKey: ["ollama-models"],
    queryFn: listOllamaModels,
    enabled: ollamaStatus?.connected,
  });

  const { data: projectContext } = useQuery({
    queryKey: ["project-context", projectId],
    queryFn: () => getProjectContext(projectId),
    enabled: !!projectId,
    staleTime: 30000,
  });

  // Load conversations
  const { refetch: refetchConversations } = useQuery({
    queryKey: ["conversations", projectId],
    queryFn: async () => {
      const convos = await listConversations(projectId);
      setConversations(convos);
      return convos;
    },
    enabled: !!projectId,
  });

  // Set default model
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel]);

  // State to store visualization results for the current streaming message
  const [vizResults, setVizResults] = useState<Map<string, { config: VisualizationConfig; result?: QueryResult; error?: string; sql: string }[]>>(new Map());

  // Auto-execute query blocks after streaming completes
  const handleStreamingComplete = useCallback(async (content: string) => {
    const messageId = crypto.randomUUID();

    // Extract query blocks
    const { blocks } = extractQueryBlocks(content);

    // Update the message content to the cleaned version (without duckbake blocks)
    // We need to finalize with the full content first, then we'll render cleanContent
    finalizeStreaming(messageId);

    // Save assistant message to database
    if (currentConversationId) {
      try {
        await addMessage(projectId, currentConversationId, "assistant", content);
      } catch (e) {
        console.error("Failed to save assistant message:", e);
      }
    }

    if (blocks.length > 0) {
      // Execute each query and store results
      const results: { config: VisualizationConfig; result?: QueryResult; error?: string; sql: string }[] = [];

      for (const block of blocks) {
        try {
          const result = await executeQuery(projectId, block.sql);
          results.push({
            config: {
              type: block.viz,
              xKey: block.xKey,
              yKey: block.yKey,
            },
            result,
            sql: block.sql,
          });
        } catch (error) {
          results.push({
            config: { type: block.viz },
            error: error instanceof Error ? error.message : "Query failed",
            sql: block.sql,
          });
        }
      }

      // Store results keyed by message ID
      setVizResults((prev) => new Map(prev).set(messageId, results));

      // Refresh context after queries
      queryClient.invalidateQueries({ queryKey: ["project-context", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tables", projectId] });
    }
  }, [projectId, currentConversationId, finalizeStreaming, queryClient]);

  // Listen for streaming events
  const streamingContentRef = useRef<string>("");

  useEffect(() => {
    const unlistenChunk = listen<string>("chat-chunk", (event) => {
      appendToStreaming(event.payload);
      streamingContentRef.current += event.payload;
    });

    const unlistenDone = listen("chat-done", () => {
      const content = streamingContentRef.current;
      streamingContentRef.current = "";
      handleStreamingComplete(content);
    });

    const unlistenError = listen<string>("chat-error", (event) => {
      console.error("Chat error:", event.payload);
      streamingContentRef.current = "";
      finalizeStreaming(crypto.randomUUID());
    });

    return () => {
      unlistenChunk.then((fn) => fn());
      unlistenDone.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, [appendToStreaming, handleStreamingComplete, finalizeStreaming]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Create new conversation
  const createNewConversation = useMutation({
    mutationFn: () => createConversation(projectId),
    onSuccess: (conversation) => {
      addConversation(conversation);
      refetchConversations();
    },
  });

  // Delete conversation
  const deleteConvo = useMutation({
    mutationFn: (id: string) => deleteConversation(projectId, id),
    onSuccess: (_, id) => {
      removeConversation(id);
      refetchConversations();
    },
  });

  // Re-execute query blocks from messages to restore visualizations
  const rehydrateVisualizations = useCallback(async (messages: ChatMessage[]) => {
    const newVizResults = new Map<string, { config: VisualizationConfig; result?: QueryResult; error?: string; sql: string }[]>();

    for (const message of messages) {
      if (message.role !== "assistant") continue;

      const { blocks } = extractQueryBlocks(message.content);
      if (blocks.length === 0) continue;

      const results: { config: VisualizationConfig; result?: QueryResult; error?: string; sql: string }[] = [];

      for (const block of blocks) {
        try {
          const result = await executeQuery(projectId, block.sql);
          results.push({
            config: {
              type: block.viz,
              xKey: block.xKey,
              yKey: block.yKey,
            },
            result,
            sql: block.sql,
          });
        } catch (error) {
          results.push({
            config: { type: block.viz },
            error: error instanceof Error ? error.message : "Query failed",
            sql: block.sql,
          });
        }
      }

      if (results.length > 0) {
        newVizResults.set(message.id, results);
      }
    }

    setVizResults(newVizResults);
  }, [projectId]);

  // Rehydrate visualizations when returning to chat with existing messages
  useEffect(() => {
    if (messages.length > 0 && vizResults.size === 0 && !isStreaming) {
      rehydrateVisualizations(messages);
    }
  }, [messages, vizResults.size, isStreaming, rehydrateVisualizations]);

  // Load conversation messages
  const loadConversation = useCallback(async (conversationId: string) => {
    setCurrentConversation(conversationId);
    try {
      const convo = await getConversation(projectId, conversationId);
      setMessages(convo.messages);
      // Re-execute queries to restore visualizations
      await rehydrateVisualizations(convo.messages);
    } catch (e) {
      console.error("Failed to load conversation:", e);
    }
  }, [projectId, setCurrentConversation, setMessages, rehydrateVisualizations]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedModel) return;

      // Create conversation if none exists
      let conversationId = currentConversationId;
      if (!conversationId) {
        try {
          const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
          const convo = await createConversation(projectId, title);
          addConversation(convo);
          refetchConversations();
          conversationId = convo.id;
        } catch (e) {
          console.error("Failed to create conversation:", e);
          return;
        }
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      addMessageToStore(userMessage);
      startStreaming();

      // Save user message to database
      try {
        await addMessage(projectId, conversationId!, "user", content);
      } catch (e) {
        console.error("Failed to save user message:", e);
      }

      // Build message history for the API
      const messageHistory: [string, string][] = [
        ...messages.map((m) => [m.role, m.content] as [string, string]),
        [userMessage.role, userMessage.content],
      ];

      // Get semantic search results for vectorized tables
      let semanticResults: Map<string, SemanticSearchResult[]> | undefined;
      try {
        const tables = await getTables(projectId);
        const vectorizedTables = tables.filter((t) => t.isVectorized);

        if (vectorizedTables.length > 0) {
          semanticResults = new Map();
          await Promise.all(
            vectorizedTables.map(async (table) => {
              try {
                const results = await semanticSearch(projectId, table.name, content, 5);
                if (results.length > 0) {
                  semanticResults!.set(table.name, results);
                }
              } catch (e) {
                console.warn(`Semantic search failed for ${table.name}:`, e);
              }
            })
          );
        }
      } catch (e) {
        console.warn("Failed to get tables for semantic search:", e);
      }

      // Build context from project data with semantic results
      const context = projectContext
        ? buildContextString(projectContext, semanticResults)
        : undefined;

      try {
        await sendChatMessage(selectedModel, messageHistory, context);
      } catch (error) {
        console.error("Failed to send message:", error);
        finalizeStreaming(crypto.randomUUID());
      }
    },
    [messages, addMessageToStore, startStreaming, finalizeStreaming, selectedModel, projectContext, projectId, currentConversationId, addConversation, refetchConversations]
  );


  if (!ollamaStatus?.connected) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Ollama Not Connected</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Make sure Ollama is running on your machine. You can download it from{" "}
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            ollama.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Conversations sidebar */}
      <div className="w-56 border-r flex flex-col shrink-0">
        <div className="p-3 border-b">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => createNewConversation.mutate()}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((convo) => (
              <div
                key={convo.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                  currentConversationId === convo.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={() => loadConversation(convo.id)}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{convo.title}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConvo.mutate(convo.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-center text-muted-foreground text-xs py-8">
                No conversations yet
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 && !isStreaming && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ask questions about your data</p>
                <p className="text-xs mt-1">
                  I can help you analyze and understand your database
                </p>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                visualizations={vizResults.get(message.id)}
              />
            ))}

            {isStreaming && (
              <div className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 bg-muted rounded-lg p-3 overflow-hidden">
                  {streamingContent ? (
                    <MarkdownContent content={streamingContent} />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  visualizations?: { config: VisualizationConfig; result?: QueryResult; error?: string; sql: string }[];
}

function MessageBubble({ message, visualizations }: MessageBubbleProps) {
  const isUser = message.role === "user";

  // Get cleaned content (without duckbake blocks) for display
  const { cleanContent } = extractQueryBlocks(message.content);
  const displayContent = cleanContent || message.content;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
          isUser ? "bg-muted" : "bg-muted/50"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div
        className={`flex-1 rounded-lg p-3 overflow-hidden ${
          isUser ? "bg-muted/70 ml-auto max-w-[80%]" : "bg-muted/50"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="space-y-4">
            {displayContent && <MarkdownContent content={displayContent} />}
            {visualizations?.map((viz, i) => (
              <div key={i}>
                {viz.error ? (
                  <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                    <strong>Query Error:</strong> {viz.error}
                  </div>
                ) : viz.result ? (
                  <DataVisualization result={viz.result} config={viz.config} sql={viz.sql} />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-pre:my-2 prose-pre:p-0 prose-pre:bg-transparent">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          pre: ({ children }) => (
            <pre className="bg-background/50 border rounded-md p-3 overflow-x-auto text-xs">
              {children}
            </pre>
          ),
          // Inline code
          code: ({ className, children, ...props }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return <code className="block">{children}</code>;
            }
            return (
              <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                {children}
              </code>
            );
          },
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-border text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2">{children}</td>
          ),
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {children}
            </a>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1">{children}</ol>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
