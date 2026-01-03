import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Plus, Database, Trash2, Moon, Sun, Pencil } from "lucide-react";
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
	const [editingProject, setEditingProject] = useState<ProjectSummary | null>(
		null,
	);
	const [editName, setEditName] = useState("");

	const { data: projects = [], isLoading } = useQuery({
		queryKey: ["projects"],
		queryFn: listProjects,
	});

	const { data: projectStats = [] } = useQuery({
		queryKey: ["projectStats"],
		queryFn: getAllProjectStats,
		enabled: projects.length > 0,
	});

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
		mutationFn: deleteProject,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["projectStats"] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({
			id,
			name,
			description,
		}: {
			id: string;
			name?: string;
			description?: string;
		}) => updateProject(id, name, description),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({
				queryKey: ["project", editingProject?.id],
			});
			setEditingProject(null);
		},
	});

	const handleCreate = () => {
		if (newProject.name.trim()) {
			createMutation.mutate(newProject);
		}
	};

	const handleDelete = (e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		if (confirm("Are you sure you want to delete this project?")) {
			deleteMutation.mutate(id);
		}
	};

	const handleEdit = (e: React.MouseEvent, project: ProjectSummary) => {
		e.stopPropagation();
		setEditingProject(project);
		setEditName(project.name);
	};

	const handleUpdate = () => {
		if (editingProject && editName.trim()) {
			updateMutation.mutate({
				id: editingProject.id,
				name: editName,
			});
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
				<h1 className="text-md font-medium text-foreground/90">Projects</h1>
				<div className="flex items-center gap-3">
					<button
						onClick={() => openUrl("https://github.com/wes/duckbake/releases")}
						className="text-[10px] font-mono text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
					>
						v{__APP_VERSION__}
					</button>
					<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="ghost" className="h-8 px-3 text-sm">
								<Plus className="mr-1.5 h-3.5 w-3.5" />
								New Project
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
						<Database className="h-12 w-12 text-muted-foreground mb-4" />
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
										<th className="w-16 text-right">Chats</th>
										<th className="w-20 text-right">Queries</th>
										<th className="w-24 text-right">Modified</th>
										<th className="w-16"></th>
									</tr>
								</thead>
								<tbody>
									{projects.map((project) => {
										const stats = statsMap.get(project.id);
										return (
											<tr
												key={project.id}
												className="cursor-pointer group"
												onClick={() => navigate(`/project/${project.id}`)}
											>
												<td>
													<div className="flex items-center gap-2.5">
														<Database className="h-4 w-4 opacity-50 shrink-0" />
														<span className="truncate font-medium">
															{project.name}
														</span>
													</div>
												</td>
												<td className="text-right text-muted-foreground tabular-nums">
													{stats ? formatNumber(stats.tableCount) : "-"}
												</td>
												<td className="text-right text-muted-foreground tabular-nums">
													{stats ? formatNumber(stats.totalRows) : "-"}
												</td>
												<td className="text-right text-muted-foreground tabular-nums">
													{stats ? formatNumber(stats.conversationCount) : "-"}
												</td>
												<td className="text-right text-muted-foreground tabular-nums">
													{stats ? formatNumber(stats.savedQueryCount) : "-"}
												</td>
												<td className="text-right text-muted-foreground">
													{new Date(project.updatedAt).toLocaleDateString()}
												</td>
												<td>
													<div className="flex justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
														<Button
															variant="ghost"
															size="icon"
															className="h-6 w-6"
															onClick={(e) => handleEdit(e, project)}
														>
															<Pencil className="h-3 w-3" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
															onClick={(e) => handleDelete(e, project.id)}
														>
															<Trash2 className="h-3 w-3" />
														</Button>
													</div>
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

			{/* Edit Project Dialog */}
			<Dialog
				open={!!editingProject}
				onOpenChange={(open) => !open && setEditingProject(null)}
			>
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
							value={editName}
							onChange={(e) => setEditName(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && editName.trim()) {
									handleUpdate();
								}
							}}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingProject(null)}>
							Cancel
						</Button>
						<Button
							onClick={handleUpdate}
							disabled={!editName.trim() || updateMutation.isPending}
						>
							{updateMutation.isPending ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
