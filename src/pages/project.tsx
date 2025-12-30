import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Database,
	Table,
	MessageSquare,
	Code,
	ChevronLeft,
	List,
	Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FileImportDialog, DropZone } from "@/components/import";
import { TableViewer, VectorizationDialog } from "@/components/database";
import { SqlEditor } from "@/components/query";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatPanel } from "@/components/chat";
import { openProject, getTables, getTableSchema, updateProject } from "@/lib/tauri";
import { useProjectStore, useAppStore } from "@/stores";

export function ProjectPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { activeTab, setActiveTab, sidebarOpen } = useAppStore();
	const { setCurrentProject, selectedTable, selectTable } = useProjectStore();
	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [editedTitle, setEditedTitle] = useState("");
	const [vectorizeTable, setVectorizeTable] = useState<string | null>(null);
	const titleInputRef = useRef<HTMLInputElement>(null);

	const { data: project, isLoading: projectLoading } = useQuery({
		queryKey: ["project", id],
		queryFn: () => openProject(id!),
		enabled: !!id,
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

	useEffect(() => {
		if (project) {
			setCurrentProject(project);
		}
		return () => setCurrentProject(null);
	}, [project, setCurrentProject]);

	useEffect(() => {
		if (isEditingTitle && titleInputRef.current) {
			titleInputRef.current.focus();
			titleInputRef.current.select();
		}
	}, [isEditingTitle]);

	const startEditingTitle = () => {
		if (project) {
			setEditedTitle(project.name);
			setIsEditingTitle(true);
		}
	};

	const saveTitle = async () => {
		if (!id || !editedTitle.trim() || editedTitle === project?.name) {
			setIsEditingTitle(false);
			return;
		}
		try {
			await updateProject(id, editedTitle.trim());
			queryClient.invalidateQueries({ queryKey: ["project", id] });
		} catch (error) {
			console.error("Failed to update project name:", error);
		}
		setIsEditingTitle(false);
	};

	const handleTitleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			saveTitle();
		} else if (e.key === "Escape") {
			setIsEditingTitle(false);
		}
	};

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
			<header className="h-14 border-b flex items-center px-4 shrink-0">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon" onClick={() => navigate("/")}>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Separator orientation="vertical" className="h-6" />
					<div className="flex items-center gap-2">
						<Database className="h-5 w-5 text-muted-foreground" />
						{isEditingTitle ? (
							<input
								ref={titleInputRef}
								type="text"
								value={editedTitle}
								onChange={(e) => setEditedTitle(e.target.value)}
								onBlur={saveTitle}
								onKeyDown={handleTitleKeyDown}
								className="font-semibold bg-transparent border-b border-foreground/20 outline-none px-0 py-0.5 min-w-[100px]"
							/>
						) : (
							<button
								onClick={startEditingTitle}
								className="font-semibold hover:text-muted-foreground transition-colors cursor-text"
							>
								{project.name}
							</button>
						)}
					</div>
				</div>
				<div className="flex-1 flex justify-center">
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
				<div className="flex items-center gap-2">
					<ThemeToggle />
				</div>
			</header>

			{/* Main content */}
			<div className="flex-1 flex overflow-hidden">
				{/* Sidebar */}
				{sidebarOpen && (
					<aside className="w-64 border-r flex flex-col shrink-0">
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
										{tables.map((table) => (
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
												<span className="truncate">{table.name}</span>
												<div className="ml-auto flex items-center gap-1">
													<Tooltip>
														<TooltipTrigger asChild>
															<button
																className={`p-1 rounded hover:bg-background/50 transition-colors ${
																	table.isVectorized
																		? "text-primary"
																		: "opacity-40 hover:opacity-100"
																}`}
																onClick={(e) => {
																	e.stopPropagation();
																	setVectorizeTable(table.name);
																}}
															>
																<Sparkles className="h-3.5 w-3.5" />
															</button>
														</TooltipTrigger>
														<TooltipContent>
															{table.isVectorized
																? "Vectorized - Click to manage"
																: "Enable vectorization"}
														</TooltipContent>
													</Tooltip>
													<span className="text-xs opacity-60">
														{table.rowCount.toLocaleString()}
													</span>
												</div>
											</div>
										))}
										<div className="pt-4">
											<DropZone projectId={id!} />
										</div>
									</div>
								)}
							</div>
						</ScrollArea>
					</aside>
				)}

				{/* Main area */}
				<main className="flex-1 flex flex-col min-h-0 overflow-hidden">
					<TabsContent value="browser" className="flex-1 m-0 overflow-hidden">
						{selectedTable ? (
							<TableViewer projectId={id!} tableName={selectedTable} />
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
												<th className="text-left px-4 py-2 font-medium">Column</th>
												<th className="text-left px-4 py-2 font-medium">Type</th>
												<th className="text-left px-4 py-2 font-medium">Nullable</th>
												<th className="text-left px-4 py-2 font-medium">Primary Key</th>
											</tr>
										</thead>
										<tbody>
											{tableSchema.columns.map((col, i) => (
												<tr key={col.name} className={i % 2 === 0 ? "" : "bg-muted/30"}>
													<td className="px-4 py-2 font-mono">{col.name}</td>
													<td className="px-4 py-2 text-muted-foreground font-mono">{col.dataType}</td>
													<td className="px-4 py-2 text-muted-foreground">{col.nullable ? "Yes" : "No"}</td>
													<td className="px-4 py-2 text-muted-foreground">{col.isPrimaryKey ? "Yes" : "—"}</td>
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
		</Tabs>
	);
}
