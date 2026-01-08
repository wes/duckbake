import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open, save } from "@tauri-apps/plugin-dialog";
import { Plus, Folder, Trash2, Moon, Sun, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { SettingsDialog } from "@/components/settings";
import { useThemeStore } from "@/stores/theme-store";
import { useAppStore } from "@/stores";
import {
	listProjects,
	createProject,
	deleteProject,
	updateProject,
	getAllProjectStats,
	exportProject,
	importProject,
} from "@/lib/tauri";
import type { CreateProjectInput, ProjectStats, ProjectSummary } from "@/types";

export function HomePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const { mode } = useThemeStore();
	const showNewProjectDialog = useAppStore((s) => s.showNewProjectDialog);
	const setShowNewProjectDialog = useAppStore((s) => s.setShowNewProjectDialog);

	// Combine local and store state for dialog
	const dialogOpen = isCreateOpen || showNewProjectDialog;
	const setDialogOpen = (open: boolean) => {
		setIsCreateOpen(open);
		setShowNewProjectDialog(open);
	};
	const isDark =
		mode === "dark" ||
		(mode === "system" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);
	const [newProject, setNewProject] = useState<CreateProjectInput>({
		name: "",
		description: "",
	});
	const [deletingProjectIds, setDeletingProjectIds] = useState<string[]>([]);
	const [inlineEditId, setInlineEditId] = useState<string | null>(null);
	const [inlineEditName, setInlineEditName] = useState("");
	const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
	const renameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const inlineInputRef = useRef<HTMLInputElement>(null);

	const { data: projects = [], isLoading } = useQuery({
		queryKey: ["projects"],
		queryFn: listProjects,
	});

	const { data: projectStats = [] } = useQuery({
		queryKey: ["projectStats"],
		queryFn: getAllProjectStats,
		enabled: projects.length > 0,
	});

	const sortedProjects = useMemo(() => {
		return [...projects].sort((a, b) =>
			a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
		);
	}, [projects]);

	const statsMap = useMemo(() => {
		const map = new Map<string, ProjectStats>();
		for (const stat of projectStats) {
			map.set(stat.projectId, stat);
		}
		return map;
	}, [projectStats]);

	const formatNumber = (num: number): string => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
		return num.toString();
	};

	const formatBytes = (bytes: number): string => {
		if (bytes === 0) return "0 B";
		if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
		if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${bytes} B`;
	};

	const createMutation = useMutation({
		mutationFn: createProject,
		onSuccess: (project) => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["projectStats"] });
			setDialogOpen(false);
			setNewProject({ name: "", description: "" });
			navigate(`/project/${project.id}`);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async (ids: string[]) => {
			for (const id of ids) {
				await deleteProject(id);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["projectStats"] });
			setSelectedProjectIds(new Set());
			setDeletingProjectIds([]);
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			name,
		}: {
			id: string;
			name: string;
		}) => updateProject(id, name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
	});

	const handleCreate = () => {
		if (newProject.name.trim()) {
			createMutation.mutate(newProject);
		}
	};

	const handleDeleteSelected = () => {
		if (selectedProjectIds.size > 0) {
			setDeletingProjectIds(Array.from(selectedProjectIds));
		}
	};

	const confirmDelete = () => {
		if (deletingProjectIds.length > 0) {
			deleteMutation.mutate(deletingProjectIds);
		}
	};

	// Focus input when inline editing starts
	useEffect(() => {
		if (inlineEditId && inlineInputRef.current) {
			inlineInputRef.current.focus();
			inlineInputRef.current.select();
		}
	}, [inlineEditId]);

	// Clean up timeout on unmount
	useEffect(() => {
		return () => {
			if (renameTimeoutRef.current) {
				clearTimeout(renameTimeoutRef.current);
			}
		};
	}, []);

	const handleRowClick = (e: React.MouseEvent, project: ProjectSummary) => {
		if (inlineEditId) return;

		// Clear any pending rename timeout
		if (renameTimeoutRef.current) {
			clearTimeout(renameTimeoutRef.current);
			renameTimeoutRef.current = null;
		}

		const isMeta = e.metaKey || e.ctrlKey;
		const isShift = e.shiftKey;

		if (isShift && lastSelectedId && sortedProjects.length > 0) {
			// Shift-click: select range
			const lastIndex = sortedProjects.findIndex((p) => p.id === lastSelectedId);
			const currentIndex = sortedProjects.findIndex((p) => p.id === project.id);
			if (lastIndex !== -1 && currentIndex !== -1) {
				const start = Math.min(lastIndex, currentIndex);
				const end = Math.max(lastIndex, currentIndex);
				const newSelection = new Set(selectedProjectIds);
				for (let i = start; i <= end; i++) {
					newSelection.add(sortedProjects[i].id);
				}
				setSelectedProjectIds(newSelection);
			}
		} else if (isMeta) {
			// Cmd/Ctrl-click: toggle selection
			const newSelection = new Set(selectedProjectIds);
			if (newSelection.has(project.id)) {
				newSelection.delete(project.id);
			} else {
				newSelection.add(project.id);
			}
			setSelectedProjectIds(newSelection);
			setLastSelectedId(project.id);
		} else {
			// Regular click: single select
			setSelectedProjectIds(new Set([project.id]));
			setLastSelectedId(project.id);
		}
	};

	const handleNameClick = (e: React.MouseEvent, project: ProjectSummary) => {
		// If already selected (single selection), start inline edit after delay (Finder behavior)
		if (selectedProjectIds.size === 1 && selectedProjectIds.has(project.id)) {
			e.stopPropagation(); // Prevent row click from resetting selection

			// Clear any existing timeout
			if (renameTimeoutRef.current) {
				clearTimeout(renameTimeoutRef.current);
			}

			renameTimeoutRef.current = setTimeout(() => {
				setInlineEditId(project.id);
				setInlineEditName(project.name);
				renameTimeoutRef.current = null;
			}, 500);
		}
		// First click - let it bubble to row for selection
	};

	const handleInlineEditSave = (projectId: string) => {
		if (inlineEditName.trim() && inlineEditName !== projects.find(p => p.id === projectId)?.name) {
			updateMutation.mutate({
				id: projectId,
				name: inlineEditName.trim(),
			});
		}
		setInlineEditId(null);
		setInlineEditName("");
	};

	const handleInlineEditCancel = () => {
		setInlineEditId(null);
		setInlineEditName("");
	};

	const handleExportSelected = async () => {
		const selectedProjects = sortedProjects.filter((p) => selectedProjectIds.has(p.id));
		for (const project of selectedProjects) {
			const path = await save({
				defaultPath: `${project.name}.duckdb`,
				filters: [{ name: "DuckDB Database", extensions: ["duckdb"] }],
			});
			if (path) {
				await exportProject(project.id, path);
			}
		}
	};

	const handleImport = async () => {
		const path = await open({
			filters: [{ name: "DuckDB Database", extensions: ["duckdb"] }],
			multiple: false,
		});
		if (path && typeof path === "string") {
			// Extract project name from filename
			const fileName = path.split("/").pop() || path;
			const projectName = fileName.replace(/\.duckdb$/i, "");
			const project = await importProject(path, projectName);
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["projectStats"] });
			navigate(`/project/${project.id}`);
		}
	};

	const handleDrag = async (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;
		const interactive = target.closest(
			"button, input, a, [role='button'], [data-radix-collection-item]",
		);
		if (!interactive) {
			await getCurrentWindow().startDragging();
		}
	};

	return (
		<div className="h-screen flex flex-col" onMouseDown={handleDrag}>
			{/* Toolbar */}
			<div
				className="h-12 border-b flex items-center justify-between px-4 shrink-0 pl-25"
				onMouseDown={handleDrag}
			>
				<div className="flex items-center gap-2">
					<h1 className="text-md font-medium text-foreground/90">Projects</h1>
					{selectedProjectIds.size > 0 && (
						<span className="text-xs text-muted-foreground">
							{selectedProjectIds.size} selected
						</span>
					)}
				</div>
				<div className="flex items-center gap-1">
					<button
						onClick={() => openUrl("https://github.com/wes/duckbake/releases")}
						className="text-[10px] font-mono text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer mr-2"
					>
						v{__APP_VERSION__}
					</button>
					<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="ghost" className="h-8 px-3 text-sm">
								<Plus className="mr-1.5 h-3.5 w-3.5" />
								New
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create New Project</DialogTitle>
								<DialogDescription>
									Create a new project to start analyzing your data.
								</DialogDescription>
							</DialogHeader>
							<div className="py-4">
								<Input
									placeholder="Project name"
									value={newProject.name}
									onChange={(e) =>
										setNewProject({ ...newProject, name: e.target.value })
									}
									onKeyDown={(e) => {
										if (e.key === "Enter" && newProject.name.trim()) {
											handleCreate();
										}
									}}
								/>
							</div>
							<DialogFooter>
								<Button variant="outline" onClick={() => setDialogOpen(false)}>
									Cancel
								</Button>
								<Button
									onClick={handleCreate}
									disabled={!newProject.name.trim() || createMutation.isPending}
								>
									{createMutation.isPending ? "Creating..." : "Create Project"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<Button variant="ghost" className="h-8 px-3 text-sm" onClick={handleImport}>
						<Upload className="mr-1.5 h-3.5 w-3.5" />
						Import
					</Button>
					<div className="w-px h-5 bg-border mx-1" />
					<Button
						variant="ghost"
						className="h-8 px-3 text-sm"
						onClick={handleExportSelected}
						disabled={selectedProjectIds.size === 0}
					>
						<Download className="mr-1.5 h-3.5 w-3.5" />
						Export
					</Button>
					<Button
						variant="ghost"
						className="h-8 px-3 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
						onClick={handleDeleteSelected}
						disabled={selectedProjectIds.size === 0}
					>
						<Trash2 className="mr-1.5 h-3.5 w-3.5" />
						Delete
					</Button>
					<div className="w-px h-5 bg-border mx-1" />
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setSettingsOpen(true)}
						className="h-8 w-8"
					>
						{isDark ? (
							<Moon className="h-4 w-4" />
						) : (
							<Sun className="h-4 w-4" />
						)}
					</Button>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto">
				{isLoading ? (
					<div>
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-10 border-b animate-pulse flex items-center px-4"
							>
								<div className="h-3 bg-muted rounded w-1/4"></div>
							</div>
						))}
					</div>
				) : projects.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-center">
						<Folder className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="font-medium mb-1">No projects yet</h3>
						<p className="text-sm text-muted-foreground mb-4">
							Create your first project to get started
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsCreateOpen(true)}
						>
							<Plus className="mr-1.5 h-3.5 w-3.5" />
							New Project
						</Button>
					</div>
				) : (
					<div className="p-3">
						<div className="overflow-hidden">
							<table>
								<thead className="sticky top-0 z-10">
									<tr>
										<th>Name</th>
										<th className="w-16 text-right">Tables</th>
										<th className="w-16 text-right">Rows</th>
										<th className="w-14 text-right">Docs</th>
										<th className="w-16 text-right">Chats</th>
										<th className="w-20 text-right">Queries</th>
										<th className="w-20 text-right">Size</th>
										<th className="w-28 text-right">Modified</th>
									</tr>
								</thead>
								<tbody>
									{sortedProjects.map((project) => {
										const stats = statsMap.get(project.id);
										const isInlineEditing = inlineEditId === project.id;
										const isSelected = selectedProjectIds.has(project.id);
										return (
											<tr
												key={project.id}
												className={`cursor-pointer ${isSelected ? "selected" : ""}`}
												onClick={(e) => handleRowClick(e, project)}
												onDoubleClick={() => {
													if (!isInlineEditing) {
														navigate(`/project/${project.id}`);
													}
												}}
											>
												<td>
													<div className="flex items-center gap-2.5">
														<Folder className={`h-5 w-5 shrink-0 ${isSelected ? "text-white" : "text-primary"}`} />
														{isInlineEditing ? (
															<div className="relative inline-flex items-center">
																<span className="invisible whitespace-pre text-[13px] font-semibold px-3">
																	{inlineEditName || " "}
																</span>
																<input
																	ref={inlineInputRef}
																	type="text"
																	value={inlineEditName}
																	onChange={(e) => setInlineEditName(e.target.value)}
																	onBlur={() => handleInlineEditSave(project.id)}
																	onKeyDown={(e) => {
																		if (e.key === "Enter") {
																			handleInlineEditSave(project.id);
																		} else if (e.key === "Escape") {
																			handleInlineEditCancel();
																		}
																	}}
																	onClick={(e) => e.stopPropagation()}
																	className="absolute inset-0 bg-background border rounded px-1 py-0 h-5 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
																/>
															</div>
														) : (
															<span
																className="truncate font-semibold"
																onClick={(e) => handleNameClick(e, project)}
															>
																{project.name}
															</span>
														)}
													</div>
												</td>
												<td className="text-right text-muted-foreground tabular-nums">
													{stats ? formatNumber(stats.tableCount) : "-"}
												</td>
												<td className="text-right text-muted-foreground tabular-nums">
													{stats ? formatNumber(stats.totalRows) : "-"}
												</td>
												<td className="text-right text-muted-foreground tabular-nums">
													{stats ? formatNumber(stats.documentCount) : "-"}
												</td>
												<td className="text-right text-muted-foreground tabular-nums">
													{stats ? formatNumber(stats.conversationCount) : "-"}
												</td>
												<td className="text-right text-muted-foreground tabular-nums">
													{stats ? formatNumber(stats.savedQueryCount) : "-"}
												</td>
												<td className="text-right text-muted-foreground tabular-nums">
													{stats ? formatBytes(stats.storageSize) : "-"}
												</td>
												<td className="text-right text-muted-foreground">
													{new Date(project.updatedAt).toLocaleDateString()}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>

			<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

			{/* Delete Project Dialog */}
			<Dialog
				open={deletingProjectIds.length > 0}
				onOpenChange={(open) => !open && setDeletingProjectIds([])}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Delete {deletingProjectIds.length === 1 ? "Project" : `${deletingProjectIds.length} Projects`}
						</DialogTitle>
						<DialogDescription>
							{deletingProjectIds.length === 1 ? (
								<>Are you sure you want to delete "{projects.find(p => p.id === deletingProjectIds[0])?.name}"? This action cannot be undone.</>
							) : (
								<>Are you sure you want to delete {deletingProjectIds.length} projects? This action cannot be undone.</>
							)}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeletingProjectIds([])}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmDelete}
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
