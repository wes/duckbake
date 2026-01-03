import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import {
	Database,
	Table,
	MessageSquare,
	Code,
	List,
	Moon,
	Sun,
	ChevronDown,
	Home,
	Pencil,
	Loader2,
	Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileImportDialog, DropZone } from "@/components/import";
import { TableViewer, VectorizationDialog } from "@/components/database";
import { SqlEditor } from "@/components/query";
import { ChatPanel } from "@/components/chat";
import { SettingsDialog } from "@/components/settings";
import {
	openProject,
	getTables,
	getTableSchema,
	listProjects,
	updateProject,
} from "@/lib/tauri";
import { useProjectStore, useAppStore, useVectorizationStore } from "@/stores";
import type { VectorizationProgress } from "@/types";
import { useThemeStore } from "@/stores/theme-store";

export function ProjectPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { activeTab, setActiveTab, sidebarOpen } = useAppStore();
	const { setCurrentProject, selectedTable, selectTable } = useProjectStore();
	const { mode } = useThemeStore();
	const { setProgress, isVectorizing } = useVectorizationStore();
	const isDark =
		mode === "dark" ||
		(mode === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);
	const [importDialogOpen, setImportDialogOpen] = useState(false);

	// Listen for vectorization progress events globally
	useEffect(() => {
		const unsubscribe = listen<VectorizationProgress>(
			"vectorization-progress",
			(event) => {
				setProgress(event.payload.tableName, event.payload);
				// Refresh tables when vectorization completes
				if (event.payload.status === "completed") {
					queryClient.invalidateQueries({ queryKey: ["tables", id] });
				}
			}
		);

		return () => {
			unsubscribe.then((fn) => fn());
		};
	}, [id, setProgress, queryClient]);
	const [vectorizeTable, setVectorizeTable] = useState<string | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [newName, setNewName] = useState("");
	const [sidebarWidth, setSidebarWidth] = useState(256);
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
			const newWidth = Math.min(Math.max(e.clientX, 180), 500);
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

	const handleDrag = async (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;
		const interactive = target.closest(
			"button, input, a, [role='button'], [data-radix-collection-item]",
		);
		if (!interactive) {
			await getCurrentWindow().startDragging();
		}
	};

	const { data: project, isLoading: projectLoading } = useQuery({
		queryKey: ["project", id],
		queryFn: () => openProject(id!),
		enabled: !!id,
	});

	const { data: allProjects = [] } = useQuery({
		queryKey: ["projects"],
		queryFn: listProjects,
	});

	const { data: tables = [], isLoading: tablesLoading } = useQuery({
		queryKey: ["tables", id],
		queryFn: () => getTables(id!),
		enabled: !!id,
	});

	const { data: tableSchema } = useQuery({
		queryKey: ["table-schema", id, selectedTable],
		queryFn: () => getTableSchema(id!, selectedTable!),
		enabled: !!id && !!selectedTable,
	});

	const renameMutation = useMutation({
		mutationFn: (name: string) => updateProject(id!, name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["project", id] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			setRenameDialogOpen(false);
		},
	});

	const handleRename = () => {
		if (newName.trim()) {
			renameMutation.mutate(newName.trim());
		}
	};

	const openRenameDialog = () => {
		setNewName(project?.name || "");
		setRenameDialogOpen(true);
	};

	useEffect(() => {
		if (project) {
			setCurrentProject(project);
		}
		return () => setCurrentProject(null);
	}, [project, setCurrentProject]);

	if (projectLoading) {
		return (
			<div className="h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (!project) {
		return (
			<div className="h-screen flex flex-col items-center justify-center gap-4">
				<p className="text-muted-foreground">Project not found</p>
				<Button onClick={() => navigate("/")}>Go Home</Button>
			</div>
		);
	}

	return (
		<Tabs
			value={activeTab}
			onValueChange={(v) => setActiveTab(v as typeof activeTab)}
			className="h-screen flex flex-col"
		>
			{/* Header */}
			<header
				className="h-14 border-b flex items-center pl-24 pr-4 shrink-0 relative"
				onMouseDown={handleDrag}
			>
				<div className="flex items-center gap-2" onMouseDown={handleDrag}>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-2 py-1.5 rounded-md transition-colors group">
								<Database className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
								<span className="font-semibold">{project.name}</span>
								<ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<DropdownMenuItem onClick={() => navigate("/")}>
								<Home className="h-4 w-4 mr-2" />
								All Projects
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={openRenameDialog}>
								<Database className="h-4 w-4 mr-2 text-primary" />
								<span className="flex-1">{project.name}</span>
								<Pencil className="h-3.5 w-3.5 text-muted-foreground" />
							</DropdownMenuItem>
							{allProjects
								.filter((p) => p.id !== id)
								.map((p) => (
									<DropdownMenuItem
										key={p.id}
										onClick={() => navigate(`/project/${p.id}`)}
									>
										<Database className="h-4 w-4 mr-2 text-muted-foreground" />
										{p.name}
									</DropdownMenuItem>
								))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="flex-1 flex justify-center" onMouseDown={handleDrag}>
					<TabsList className="h-9 bg-transparent">
						<TabsTrigger value="browser" className="gap-2">
							<Table className="h-4 w-4" />
							Browser
						</TabsTrigger>
						<TabsTrigger value="schema" className="gap-2">
							<List className="h-4 w-4" />
							Schema
						</TabsTrigger>
						<TabsTrigger value="query" className="gap-2">
							<Code className="h-4 w-4" />
							Query
						</TabsTrigger>
						<TabsTrigger value="chat" className="gap-2">
							<MessageSquare className="h-4 w-4" />
							Chat
						</TabsTrigger>
					</TabsList>
				</div>
				<div className="flex items-center gap-2" onMouseDown={handleDrag}>
					<span className="text-[10px] font-mono text-muted-foreground/70">
						v{__APP_VERSION__}
					</span>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setSettingsOpen(true)}
					>
						{isDark ? (
							<Moon className="h-5 w-5" />
						) : (
							<Sun className="h-5 w-5" />
						)}
					</Button>
				</div>
			</header>

			{/* Main content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Sidebar */}
				{sidebarOpen && (
					<>
						<aside
							className="border-r flex flex-col shrink-0"
							style={{ width: sidebarWidth }}
						>
							<ScrollArea className="flex-1">
								<div className="p-2">
									{tablesLoading ? (
										<div className="space-y-2">
											{[1, 2, 3].map((i) => (
												<div
													key={i}
													className="h-8 bg-muted rounded animate-pulse"
												></div>
											))}
										</div>
									) : tables.length === 0 ? (
										<div className="py-4">
											<DropZone projectId={id!} />
										</div>
									) : (
										<div className="space-y-1">
											{tables.map((table) => {
												const vectorizing = isVectorizing(table.name);
												return (
													<div
														key={table.name}
														className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors cursor-pointer ${
															selectedTable === table.name
																? "bg-muted text-foreground"
																: "text-muted-foreground hover:text-foreground hover:bg-muted/50"
														}`}
														onClick={() => {
															selectTable(table.name);
															setActiveTab("browser");
														}}
													>
														<Table className="h-4 w-4 shrink-0" />
														<span className="truncate flex-1 min-w-0">
															{table.name}
														</span>
														{vectorizing ? (
															<Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
														) : table.isVectorized ? (
															<Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
														) : (
															<span className="text-xs opacity-60 shrink-0">
																{table.rowCount.toLocaleString()}
															</span>
														)}
													</div>
												);
											})}
											<div className="pt-4">
												<DropZone projectId={id!} />
											</div>
										</div>
									)}
								</div>
							</ScrollArea>
						</aside>
						{/* Resize handle */}
						<div
							className="w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary transition-colors shrink-0"
							onMouseDown={startResizing}
						/>
					</>
				)}

				{/* Main area */}
				<main className="flex-1 flex flex-col min-h-0 overflow-hidden">
					<TabsContent value="browser" className="flex-1 m-0 overflow-hidden">
						{selectedTable ? (
							<TableViewer
								projectId={id!}
								tableName={selectedTable}
								isVectorized={
									tables.find((t) => t.name === selectedTable)?.isVectorized
								}
								onVectorize={() => setVectorizeTable(selectedTable)}
							/>
						) : (
							<div className="flex flex-col items-center justify-center h-full text-center">
								<Table className="h-12 w-12 text-muted-foreground mb-4" />
								<h3 className="font-medium mb-1">Select a table</h3>
								<p className="text-sm text-muted-foreground">
									Choose a table from the sidebar to view its data
								</p>
							</div>
						)}
					</TabsContent>

					<TabsContent value="schema" className="flex-1 m-0 overflow-hidden">
						{selectedTable && tableSchema ? (
							<div className="p-4 overflow-auto h-full">
								<div className="mb-4">
									<h2 className="text-lg font-semibold">{tableSchema.name}</h2>
									<p className="text-sm text-muted-foreground">
										{tableSchema.columns.length} columns
									</p>
								</div>
								<div className="border rounded-md overflow-hidden">
									<table className="w-full text-sm">
										<thead className="bg-muted/50">
											<tr>
												<th className="text-left px-4 py-2 font-medium">
													Column
												</th>
												<th className="text-left px-4 py-2 font-medium">
													Type
												</th>
												<th className="text-left px-4 py-2 font-medium">
													Nullable
												</th>
												<th className="text-left px-4 py-2 font-medium">
													Primary Key
												</th>
											</tr>
										</thead>
										<tbody>
											{tableSchema.columns.map((col, i) => (
												<tr
													key={col.name}
													className={i % 2 === 0 ? "" : "bg-muted/30"}
												>
													<td className="px-4 py-2 font-mono">{col.name}</td>
													<td className="px-4 py-2 text-muted-foreground font-mono">
														{col.dataType}
													</td>
													<td className="px-4 py-2 text-muted-foreground">
														{col.nullable ? "Yes" : "No"}
													</td>
													<td className="px-4 py-2 text-muted-foreground">
														{col.isPrimaryKey ? "Yes" : "—"}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center h-full text-center">
								<List className="h-12 w-12 text-muted-foreground mb-4" />
								<h3 className="font-medium mb-1">Select a table</h3>
								<p className="text-sm text-muted-foreground">
									Choose a table from the sidebar to view its schema
								</p>
							</div>
						)}
					</TabsContent>

					<TabsContent value="query" className="flex-1 m-0 overflow-hidden">
						<SqlEditor projectId={id!} />
					</TabsContent>

					<TabsContent
						value="chat"
						className="flex-1 m-0 min-h-0 overflow-hidden"
					>
						<ChatPanel projectId={id!} />
					</TabsContent>
				</main>
			</div>

			{/* Import Dialog */}
			<FileImportDialog
				projectId={id!}
				open={importDialogOpen}
				onOpenChange={setImportDialogOpen}
			/>

			{/* Vectorization Dialog */}
			{vectorizeTable && (
				<VectorizationDialog
					projectId={id!}
					tableName={vectorizeTable}
					open={!!vectorizeTable}
					onOpenChange={(open) => !open && setVectorizeTable(null)}
				/>
			)}

			{/* Settings Dialog */}
			<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

			{/* Rename Dialog */}
			<Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename Project</DialogTitle>
						<DialogDescription>
							Enter a new name for your project.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<Input
							placeholder="Project name"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && newName.trim()) {
									handleRename();
								}
							}}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setRenameDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleRename}
							disabled={!newName.trim() || renameMutation.isPending}
						>
							{renameMutation.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Tabs>
	);
}
