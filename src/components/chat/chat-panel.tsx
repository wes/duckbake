import { useEffect, useRef, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
	Bot,
	User,
	Loader2,
	Plus,
	MessageSquare,
	Trash2,
	Settings2,
	Database,
	FileText,
	Sparkles,
} from "lucide-react";
import { CodeBlock } from "./code-block";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ChatInput } from "./chat-input";
import {
	DataVisualization,
	type VisualizationConfig,
	type VizType,
} from "./data-visualization";
import { OllamaSetup, OllamaModelManager } from "@/components/ollama";
import { useChatStore } from "@/stores";
import {
	listOllamaModels,
	checkOllamaStatus,
	sendChatMessage,
	getProjectContext,
	executeQuery,
	getTables,
	semanticSearch,
	semanticSearchDocuments,
	getDocumentChunksById,
	getDocuments,
	listConversations,
	createConversation,
	getConversation,
	deleteConversation,
	addMessage,
} from "@/lib/tauri";
import type {
	ChatMessage,
	ProjectContext,
	QueryResult,
	SemanticSearchResult,
	DocumentSearchResult,
} from "@/types";

interface ChatPanelProps {
	projectId: string;
}

// Common embedding model name patterns to filter out from chat
const EMBEDDING_MODEL_PATTERNS = [
	"embed",
	"all-minilm",
	"bge-",
	"e5-",
	"gte-",
	"paraphrase",
];

// Fun loading messages
const LOADING_MESSAGES = [
	"Thinking...",
	"Pondering...",
	"Vibing...",
	"Digging...",
	"Crunching...",
	"Brewing...",
	"Cooking...",
	"Querying...",
	"Analyzing...",
	"Processing...",
	"Conjuring...",
	"Synthesizing...",
	"Computing...",
	"Marinating...",
	"Percolating...",
	"Simmering...",
];

function isEmbeddingModel(modelName: string): boolean {
	const name = modelName.toLowerCase();
	return EMBEDDING_MODEL_PATTERNS.some((pattern) => name.includes(pattern));
}

// Parsed query block from AI response
interface QueryBlock {
	sql: string;
	viz: VizType;
	xKey?: string;
	yKey?: string;
}

// Extract duckbake query blocks from content
function extractQueryBlocks(content: string): {
	blocks: QueryBlock[];
	cleanContent: string;
} {
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
	semanticResults?: Map<string, SemanticSearchResult[]>,
	documentResults?: DocumentSearchResult[],
): string {
	let str = "";

	// Add database schema section
	if (context.tables.length > 0) {
		str += "DATABASE SCHEMA:\n\n";

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
				str +=
					"```json\n" + JSON.stringify(table.sampleRows, null, 2) + "\n```\n";
			}
			str += "\n";
		}
	}

	// Add document context section
	if (documentResults && documentResults.length > 0) {
		str += "\nDOCUMENT CONTEXT:\n";
		str +=
			"The following relevant excerpts were found in uploaded documents:\n\n";

		// Group by document
		const byDoc = new Map<string, DocumentSearchResult[]>();
		for (const r of documentResults) {
			const existing = byDoc.get(r.documentName) || [];
			existing.push(r);
			byDoc.set(r.documentName, existing);
		}

		for (const [docName, results] of byDoc) {
			str += `FROM "${docName}":\n`;
			for (const r of results) {
				str += `  - ${r.content} (relevance: ${(r.similarity * 100).toFixed(0)}%)\n`;
			}
			str += "\n";
		}
	}

	return str || "No data available in this project yet.";
}

export function ChatPanel({ projectId }: ChatPanelProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [selectedModel, setSelectedModelState] = useState<string>(() => {
		return localStorage.getItem("selected-ollama-model") || "";
	});

	const setSelectedModel = (model: string) => {
		setSelectedModelState(model);
		localStorage.setItem("selected-ollama-model", model);
	};
	const [sidebarWidth, setSidebarWidth] = useState(224);
	const isResizing = useRef(false);
	const [showSetup, setShowSetup] = useState(false);
	const [showModelManager, setShowModelManager] = useState(false);
	const [setupDismissed, setSetupDismissed] = useState(() => {
		return localStorage.getItem("ollama-setup-complete") === "true";
	});
	const [loadingMessage, setLoadingMessage] = useState(
		() => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
	);

	const dismissSetup = () => {
		localStorage.setItem("ollama-setup-complete", "true");
		setSetupDismissed(true);
	};

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
	const queryClient = useQueryClient();

	const {
		currentConversationId,
		messages,
		isStreaming,
		streamingContent,
		contextMode,
		conversations,
		setConversations,
		setCurrentConversation,
		addConversation,
		removeConversation,
		setContextMode,
		addMessage: addMessageToStore,
		setMessages,
		startStreaming,
		appendToStreaming,
		finalizeStreaming,
		resetForProject,
	} = useChatStore();

	// Cycle through loading messages while waiting for response
	useEffect(() => {
		if (!isStreaming || streamingContent) return;

		const interval = setInterval(() => {
			setLoadingMessage(
				LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
			);
		}, 2000);

		return () => clearInterval(interval);
	}, [isStreaming, streamingContent]);

	const { data: ollamaStatus } = useQuery({
		queryKey: ["ollama-status"],
		queryFn: checkOllamaStatus,
		refetchInterval: 10000,
	});

	const { data: models = [] } = useQuery({
		queryKey: ["ollama-models"],
		queryFn: listOllamaModels,
		enabled: ollamaStatus?.connected,
		select: (data) => data.filter((model) => !isEmbeddingModel(model.name)),
	});

	const { data: projectContext } = useQuery({
		queryKey: ["project-context", projectId],
		queryFn: () => getProjectContext(projectId),
		enabled: !!projectId,
		staleTime: 30000,
	});

	// Load conversations for this project
	const { data: conversationsData = [], refetch: refetchConversations } =
		useQuery({
			queryKey: ["conversations", projectId],
			queryFn: () => listConversations(projectId),
			enabled: !!projectId,
			staleTime: 0, // Always consider stale to ensure fresh data
			refetchOnMount: "always", // Always refetch when component mounts
		});

	// Track if we've auto-selected for this project
	const autoSelectedForProject = useRef<string | null>(null);

	// Sync conversations to store and auto-select first if needed
	useEffect(() => {
		if (conversationsData.length > 0) {
			setConversations(conversationsData);

			// Auto-select first conversation if none selected and we haven't auto-selected for this project yet
			if (
				!currentConversationId &&
				autoSelectedForProject.current !== projectId
			) {
				autoSelectedForProject.current = projectId;
				const firstConvo = conversationsData[0];
				setCurrentConversation(firstConvo.id);
				getConversation(projectId, firstConvo.id)
					.then((convoWithMessages) => {
						setMessages(convoWithMessages.messages);
					})
					.catch((e) => {
						console.error("Failed to load conversation messages:", e);
					});
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationsData, projectId]);

	// Set default model or validate saved model still exists
	useEffect(() => {
		if (models.length > 0) {
			const savedModelExists = models.some((m) => m.name === selectedModel);
			if (!selectedModel || !savedModelExists) {
				setSelectedModel(models[0].name);
			}
		}
	}, [models, selectedModel]);

	// State to store visualization results for the current streaming message
	const [vizResults, setVizResults] = useState<
		Map<
			string,
			{
				config: VisualizationConfig;
				result?: QueryResult;
				error?: string;
				sql: string;
			}[]
		>
	>(new Map());

	// State for search indicator
	const [searchStatus, setSearchStatus] = useState<{
		searching: boolean;
		sources: ("tables" | "documents")[];
	} | null>(null);

	// Reset chat state when project changes
	const prevProjectId = useRef<string | null>(null);
	useEffect(() => {
		if (prevProjectId.current !== projectId) {
			// Always reset when switching to a different project
			resetForProject();
			setVizResults(new Map());
			prevProjectId.current = projectId;
		}
	}, [projectId, resetForProject]);

	// Generate a smart title from the user's message
	const generateSmartTitle = (userMessage: string): string => {
		// Clean up the message
		let title = userMessage.trim();

		// Remove common question starters to get to the meat of the question
		const questionStarters = [
			/^(can you |could you |please |help me |i want to |i need to |i'd like to |show me |tell me |explain |what is |what are |what's |how do i |how can i |how to |why is |why are |where is |where are |when is |when are |who is |who are )/i,
		];

		for (const pattern of questionStarters) {
			title = title.replace(pattern, "");
		}

		// Capitalize first letter
		title = title.charAt(0).toUpperCase() + title.slice(1);

		// Remove trailing question mark and punctuation
		title = title.replace(/[?!.,;:]+$/, "");

		// Limit to reasonable length (aim for 5-8 words or 40 chars)
		const words = title.split(/\s+/);
		if (words.length > 8) {
			title = words.slice(0, 8).join(" ");
		}
		if (title.length > 40) {
			title = title.slice(0, 40).trim();
			// Don't cut off mid-word
			const lastSpace = title.lastIndexOf(" ");
			if (lastSpace > 20) {
				title = title.slice(0, lastSpace);
			}
		}

		return title || "New Chat";
	};

	// Auto-execute query blocks after streaming completes
	const handleStreamingComplete = useCallback(
		async (content: string) => {
			const messageId = crypto.randomUUID();

			// Extract query blocks
			const { blocks } = extractQueryBlocks(content);

			// Update the message content to the cleaned version (without duckbake blocks)
			// We need to finalize with the full content first, then we'll render cleanContent
			finalizeStreaming(messageId);

			// Save assistant message to database
			if (currentConversationId) {
				try {
					await addMessage(
						projectId,
						currentConversationId,
						"assistant",
						content,
					);
				} catch (e) {
					console.error("Failed to save assistant message:", e);
				}
			}

			if (blocks.length > 0) {
				// Execute each query and store results
				const results: {
					config: VisualizationConfig;
					result?: QueryResult;
					error?: string;
					sql: string;
				}[] = [];

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
							error: error instanceof Error ? error.message : String(error),
							sql: block.sql,
						});
					}
				}

				// Store results keyed by message ID
				setVizResults((prev) => new Map(prev).set(messageId, results));

				// Refresh context after queries
				queryClient.invalidateQueries({
					queryKey: ["project-context", projectId],
				});
				queryClient.invalidateQueries({ queryKey: ["tables", projectId] });
			}
		},
		[projectId, currentConversationId, finalizeStreaming, queryClient],
	);

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
	const rehydrateVisualizations = useCallback(
		async (messages: ChatMessage[]) => {
			const newVizResults = new Map<
				string,
				{
					config: VisualizationConfig;
					result?: QueryResult;
					error?: string;
					sql: string;
				}[]
			>();

			for (const message of messages) {
				if (message.role !== "assistant") continue;

				const { blocks } = extractQueryBlocks(message.content);
				if (blocks.length === 0) continue;

				const results: {
					config: VisualizationConfig;
					result?: QueryResult;
					error?: string;
					sql: string;
				}[] = [];

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
							error: error instanceof Error ? error.message : String(error),
							sql: block.sql,
						});
					}
				}

				if (results.length > 0) {
					newVizResults.set(message.id, results);
				}
			}

			setVizResults(newVizResults);
		},
		[projectId],
	);

	// Rehydrate visualizations when returning to chat with existing messages
	useEffect(() => {
		if (messages.length > 0 && vizResults.size === 0 && !isStreaming) {
			rehydrateVisualizations(messages);
		}
	}, [messages, vizResults.size, isStreaming, rehydrateVisualizations]);

	// Load conversation messages
	const loadConversation = useCallback(
		async (conversationId: string) => {
			setCurrentConversation(conversationId);
			try {
				const convo = await getConversation(projectId, conversationId);
				setMessages(convo.messages);
				// Re-execute queries to restore visualizations
				await rehydrateVisualizations(convo.messages);
			} catch (e) {
				console.error("Failed to load conversation:", e);
			}
		},
		[projectId, setCurrentConversation, setMessages, rehydrateVisualizations],
	);

	const handleSend = useCallback(
		async (content: string) => {
			if (!selectedModel) return;

			// Create conversation if none exists
			let conversationId = currentConversationId;
			if (!conversationId) {
				try {
					const title = generateSmartTitle(content);
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

			// Determine what to search based on context mode
			// "auto" uses intent detection, "data" searches tables only, "documents" searches documents only
			const searchData = contextMode === "auto" || contextMode === "data";
			const searchDocs = contextMode === "auto" || contextMode === "documents";

			// Initialize search status
			setSearchStatus({ searching: true, sources: [] });

			// Get semantic search results for vectorized tables
			let semanticResults: Map<string, SemanticSearchResult[]> | undefined;
			if (searchData) {
				try {
					const tables = await getTables(projectId);
					const vectorizedTables = tables.filter((t) => t.isVectorized);

					if (vectorizedTables.length > 0) {
						setSearchStatus((prev) => ({
							searching: true,
							sources: [...(prev?.sources || []), "tables"],
						}));
						semanticResults = new Map();
						await Promise.all(
							vectorizedTables.map(async (table) => {
								try {
									const results = await semanticSearch(
										projectId,
										table.name,
										content,
										5,
									);
									if (results.length > 0) {
										semanticResults!.set(table.name, results);
									}
								} catch (e) {
									console.warn(`Semantic search failed for ${table.name}:`, e);
								}
							}),
						);
					}
				} catch (e) {
					console.warn("Failed to get tables for semantic search:", e);
				}
			}

			// Get document search results if needed
			let documentResults: DocumentSearchResult[] | undefined;
			if (searchDocs) {
				try {
					const docs = await getDocuments(projectId);
					const vectorizedDocs = docs.filter((d) => d.isVectorized);

					if (vectorizedDocs.length > 0) {
						setSearchStatus((prev) => ({
							searching: true,
							sources: [...(prev?.sources || []), "documents"],
						}));

						// Check if user mentions any document by name
						const contentLower = content.toLowerCase();
						const mentionedDocs = vectorizedDocs.filter((doc) => {
							const nameLower = doc.filename.toLowerCase();
							const nameWithoutExt = nameLower.replace(/\.[^/.]+$/, "");
							return (
								contentLower.includes(nameLower) ||
								contentLower.includes(nameWithoutExt)
							);
						});

						// If specific documents are mentioned, get their chunks directly
						if (mentionedDocs.length > 0) {
							const directChunks = await Promise.all(
								mentionedDocs.map((doc) =>
									getDocumentChunksById(projectId, doc.id, 10),
								),
							);
							documentResults = directChunks.flat();
						} else {
							// Otherwise use semantic search
							documentResults = await semanticSearchDocuments(
								projectId,
								content,
								5,
							);
						}
					}
				} catch (e) {
					console.warn("Document search failed:", e);
				}
			}

			// Clear search status
			setSearchStatus(null);

			// Build context from project data with semantic results and document results
			const context = projectContext
				? buildContextString(projectContext, semanticResults, documentResults)
				: undefined;

			try {
				await sendChatMessage(selectedModel, messageHistory, context);
			} catch (error) {
				console.error("Failed to send message:", error);
				finalizeStreaming(crypto.randomUUID());
			}
		},
		[
			messages,
			addMessageToStore,
			startStreaming,
			finalizeStreaming,
			selectedModel,
			projectContext,
			projectId,
			currentConversationId,
			addConversation,
			refetchConversations,
			contextMode,
		],
	);

	// Show model manager
	if (showModelManager) {
		return <OllamaModelManager onBack={() => setShowModelManager(false)} />;
	}

	// Show setup wizard if Ollama not connected or setup requested
	if (!ollamaStatus?.connected || showSetup) {
		return (
			<OllamaSetup
				onComplete={() => {
					setShowSetup(false);
					dismissSetup();
				}}
				onManageModels={() => {
					setShowSetup(false);
					setShowModelManager(true);
				}}
			/>
		);
	}

	// Check if models are available - if not, show setup (unless dismissed)
	const hasEmbeddingModel = models.some(
		(m) =>
			m.name.toLowerCase().includes("nomic") ||
			m.name.toLowerCase().includes("embed"),
	);
	const hasChatModel = models.some((m) => !isEmbeddingModel(m.name));

	if (!setupDismissed && (!hasEmbeddingModel || !hasChatModel)) {
		return (
			<OllamaSetup
				onComplete={dismissSetup}
				onManageModels={() => setShowModelManager(true)}
			/>
		);
	}

	return (
		<div className="h-full flex overflow-hidden">
			{/* Conversations sidebar */}
			<div
				className="border-r flex flex-col shrink-0"
				style={{ width: sidebarWidth }}
			>
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
			{/* Resize handle */}
			<div
				className="w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors shrink-0"
				onMouseDown={startResizing}
			/>

			{/* Main chat area */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{/* Chat header with model select and delete option */}
				<div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
					<div className="flex items-center gap-2">
						{currentConversationId ? (
							<>
								<MessageSquare className="h-5 w-5 text-muted-foreground" />
								<span className="font-medium truncate max-w-[300px]">
									{conversations.find((c) => c.id === currentConversationId)
										?.title || "Chat"}
								</span>
							</>
						) : (
							<span className="text-muted-foreground">New conversation</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						{/* Context mode toggle */}
						<div className="inline-flex rounded-md border bg-muted/50 p-0.5">
							<button
								onClick={() => setContextMode("auto")}
								className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
									contextMode === "auto"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground/60 hover:text-muted-foreground"
								}`}
								title="Auto-detect context"
							>
								<Sparkles className="h-3 w-3" />
								Auto
							</button>
							<button
								onClick={() => setContextMode("data")}
								className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
									contextMode === "data"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground/60 hover:text-muted-foreground"
								}`}
								title="Data tables only"
							>
								<Database className="h-3 w-3" />
								Data
							</button>
							<button
								onClick={() => setContextMode("documents")}
								className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
									contextMode === "documents"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground/60 hover:text-muted-foreground"
								}`}
								title="Documents only"
							>
								<FileText className="h-3 w-3" />
								Docs
							</button>
						</div>
						<Select value={selectedModel} onValueChange={setSelectedModel}>
							<SelectTrigger className="w-44 h-7 text-xs">
								<SelectValue placeholder="Select model" />
							</SelectTrigger>
							<SelectContent>
								{models.map((model) => (
									<SelectItem key={model.name} value={model.name}>
										{model.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9 text-muted-foreground"
							onClick={() => setShowModelManager(true)}
							title="Manage AI models"
						>
							<Settings2 className="h-4 w-4" />
						</Button>
						{currentConversationId && (
							<Button
								variant="ghost"
								size="icon"
								className="h-9 w-9 text-muted-foreground hover:text-destructive"
								onClick={() => {
									if (confirm("Delete this conversation?")) {
										deleteConvo.mutate(currentConversationId);
									}
								}}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>

				{/* Messages */}
				<div className="flex-1 min-h-0 overflow-y-auto chat-scroll" ref={scrollRef}>
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
								<div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
									<Bot className="h-5 w-5 text-primary" />
								</div>
								<div className="flex-1 bg-muted rounded-lg p-3 overflow-hidden">
									{streamingContent ? (
										<MarkdownContent content={streamingContent} />
									) : (
										<span className="text-sm font-medium loading-shimmer">
											{loadingMessage}
										</span>
									)}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Search indicator */}
				{searchStatus?.searching && searchStatus.sources.length > 0 && (
					<div className="px-4 py-2 border-t">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="h-3 w-3 animate-spin" />
							<span>Searching {searchStatus.sources.join(" + ")}...</span>
						</div>
					</div>
				)}

				{/* Input */}
				<ChatInput
					onSend={handleSend}
					disabled={isStreaming || searchStatus?.searching}
				/>
			</div>
		</div>
	);
}

interface MessageBubbleProps {
	message: ChatMessage;
	visualizations?: {
		config: VisualizationConfig;
		result?: QueryResult;
		error?: string;
		sql: string;
	}[];
}

function MessageBubble({ message, visualizations }: MessageBubbleProps) {
	const isUser = message.role === "user";

	// Get cleaned content (without duckbake blocks) for display
	const { cleanContent } = extractQueryBlocks(message.content);
	const displayContent = cleanContent || message.content;

	return (
		<div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
			<div
				className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
					isUser ? "bg-muted" : "bg-primary/10"
				}`}
			>
				{isUser ? (
					<User className="h-5 w-5 text-muted-foreground" />
				) : (
					<Bot className="h-5 w-5 text-primary" />
				)}
			</div>
			<div
				className={`flex-1 rounded-lg p-3 overflow-hidden ${
					isUser ? "bg-muted/70 ml-auto max-w-[80%]" : "bg-muted/50"
				}`}
			>
				{isUser ? (
					<p className="text-[15px] leading-relaxed whitespace-pre-wrap">
						{message.content}
					</p>
				) : (
					<div className="space-y-4">
						{displayContent && <MarkdownContent content={displayContent} />}
						{visualizations?.map((viz, i) => (
							<div key={i}>
								{viz.error ? (
									<div className="bg-destructive/10 text-destructive rounded-lg p-3 text-[15px]">
										<strong>Query Error:</strong> {viz.error}
									</div>
								) : viz.result ? (
									<DataVisualization
										result={viz.result}
										config={viz.config}
										sql={viz.sql}
									/>
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
		<div className="text-[15px] leading-relaxed text-foreground prose prose-base dark:prose-invert max-w-none prose-p:my-2 prose-p:text-foreground prose-headings:my-3 prose-headings:text-foreground prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-li:text-foreground prose-pre:my-2 prose-pre:p-0 prose-pre:bg-transparent prose-strong:text-foreground">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					// Code blocks with syntax highlighting
					pre: ({ children }) => {
						return <>{children}</>;
					},
					code: ({ className, children, ...props }) => {
						const match = /language-(\w+)/.exec(className || "");
						const isBlock = Boolean(match);
						const code = String(children).replace(/\n$/, "");

						if (isBlock) {
							return <CodeBlock code={code} language={match?.[1]} />;
						}

						return (
							<code
								className="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono text-foreground"
								{...props}
							>
								{children}
							</code>
						);
					},
					// Tables
					table: ({ children }) => (
						<div className="overflow-x-auto my-3 chat-table">
							<table className="min-w-full border-collapse border border-border text-sm">
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
						<ul className="list-disc pl-5 space-y-1">{children}</ul>
					),
					ol: ({ children }) => (
						<ol className="list-decimal pl-5 space-y-1">{children}</ol>
					),
					li: ({ children }) => (
						<li className="[&>p]:inline [&>p]:m-0">{children}</li>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
