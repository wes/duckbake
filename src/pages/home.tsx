import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Plus, Database, Trash2, FolderOpen, Table2, Rows3, MessageSquare, FileCode, Moon, Sun, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
import { listProjects, createProject, deleteProject, updateProject, getAllProjectStats } from "@/lib/tauri";
import type { CreateProjectInput, ProjectStats, ProjectSummary } from "@/types";

export function HomePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const { mode } = useThemeStore();
	const isDark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
	const [newProject, setNewProject] = useState<CreateProjectInput>({
		name: "",
		description: "",
	});
	const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null);
	const [editForm, setEditForm] = useState({ name: "", description: "" });

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
			setIsCreateOpen(false);
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
		mutationFn: ({ id, name, description }: { id: string; name?: string; description?: string }) =>
			updateProject(id, name, description),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["projects"] });
			queryClient.invalidateQueries({ queryKey: ["project", editingProject?.id] });
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
		setEditForm({ name: project.name, description: project.description });
	};

	const handleUpdate = () => {
		if (editingProject && editForm.name.trim()) {
			updateMutation.mutate({
				id: editingProject.id,
				name: editForm.name,
				description: editForm.description,
			});
		}
	};

	const handleDrag = async (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;
		const interactive = target.closest("button, input, a, [role='button'], [data-radix-collection-item]");
		if (!interactive) {
			await getCurrentWindow().startDragging();
		}
	};

	return (
		<div className="min-h-screen mesh-gradient" onMouseDown={handleDrag}>
			<div className="container mx-auto py-12 px-6" onMouseDown={handleDrag}>
				<div className="flex items-center justify-between mb-10">
					<h1 className="text-2xl font-semibold text-foreground/90">Projects</h1>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setSettingsOpen(true)}
							className="rounded-xl"
						>
							{isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
						</Button>
						<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
							<DialogTrigger asChild>
								<Button className="glass-button rounded-xl px-5 py-2.5 font-medium">
									<Plus className="mr-2 h-4 w-4" />
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
							<div className="space-y-4 py-4">
								<div className="space-y-2">
									<label className="text-sm font-medium">Project Name</label>
									<Input
										placeholder="My Analysis Project"
										value={newProject.name}
										onChange={(e) =>
											setNewProject({ ...newProject, name: e.target.value })
										}
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium">Description</label>
									<Textarea
										placeholder="What is this project about?"
										value={newProject.description}
										onChange={(e) =>
											setNewProject({
												...newProject,
												description: e.target.value,
											})
										}
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setIsCreateOpen(false)}
								>
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
					</div>
				</div>

				{isLoading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{[1, 2, 3].map((i) => (
							<Card key={i} className="glass-card animate-pulse">
								<CardHeader>
									<div className="h-5 bg-white/5 rounded-lg w-3/4"></div>
									<div className="h-4 bg-white/5 rounded-lg w-1/2 mt-2"></div>
								</CardHeader>
							</Card>
						))}
					</div>
				) : projects.length === 0 ? (
					<Card className="glass-card text-center py-16 max-w-md mx-auto">
						<CardContent>
							<div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
								<Database className="h-8 w-8 text-primary" />
							</div>
							<h3 className="text-xl font-semibold mb-3">No projects yet</h3>
							<p className="text-muted-foreground mb-6">
								Create your first project to get started
							</p>
							<Button
								onClick={() => setIsCreateOpen(true)}
								className="glass-button rounded-xl px-5 py-2.5 font-medium"
							>
								<Plus className="mr-2 h-4 w-4" />
								Create Project
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{projects.map((project) => {
							const stats = statsMap.get(project.id);
							return (
								<Card
									key={project.id}
									className="glass-card cursor-pointer group"
									onClick={() => navigate(`/project/${project.id}`)}
								>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
													<Database className="h-5 w-5 text-primary" />
												</div>
												<CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
											</div>
											<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 rounded-lg hover:bg-white/10"
													onClick={(e) => {
														e.stopPropagation();
														navigate(`/project/${project.id}`);
													}}
												>
													<FolderOpen className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 rounded-lg hover:bg-white/10"
													onClick={(e) => handleEdit(e, project)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
													onClick={(e) => handleDelete(e, project.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
										<CardDescription className="line-clamp-2 mt-2 text-muted-foreground/80">
											{project.description || "No description"}
										</CardDescription>
									</CardHeader>
									<CardContent className="pt-0">
										<div className="flex items-center gap-4 text-xs text-muted-foreground/70 mb-3 py-3 px-3 -mx-3 rounded-xl bg-white/[0.03]">
											<div className="flex items-center gap-1.5" title="Tables">
												<Table2 className="h-3.5 w-3.5" />
												<span className="font-medium">{stats ? formatNumber(stats.tableCount) : "-"}</span>
											</div>
											<div className="flex items-center gap-1.5" title="Total rows">
												<Rows3 className="h-3.5 w-3.5" />
												<span className="font-medium">{stats ? formatNumber(stats.totalRows) : "-"}</span>
											</div>
											<div className="flex items-center gap-1.5" title="Conversations">
												<MessageSquare className="h-3.5 w-3.5" />
												<span className="font-medium">{stats ? formatNumber(stats.conversationCount) : "-"}</span>
											</div>
											<div className="flex items-center gap-1.5" title="Saved queries">
												<FileCode className="h-3.5 w-3.5" />
												<span className="font-medium">{stats ? formatNumber(stats.savedQueryCount) : "-"}</span>
											</div>
										</div>
										<p className="text-xs text-muted-foreground/60">
											Updated {new Date(project.updatedAt).toLocaleDateString()}
										</p>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}
			</div>

			<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

			{/* Edit Project Dialog */}
			<Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Project</DialogTitle>
						<DialogDescription>
							Update your project's name and description.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Project Name</label>
							<Input
								placeholder="My Analysis Project"
								value={editForm.name}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium">Description</label>
							<Textarea
								placeholder="What is this project about?"
								value={editForm.description}
								onChange={(e) =>
									setEditForm({
										...editForm,
										description: e.target.value,
									})
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setEditingProject(null)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleUpdate}
							disabled={!editForm.name.trim() || updateMutation.isPending}
						>
							{updateMutation.isPending ? "Saving..." : "Save Changes"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
