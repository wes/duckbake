import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Database, Trash2, FolderOpen, Table2, Rows3, MessageSquare, FileCode } from "lucide-react";
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
import { listProjects, createProject, deleteProject, getAllProjectStats } from "@/lib/tauri";
import type { CreateProjectInput, ProjectStats } from "@/types";

export function HomePage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newProject, setNewProject] = useState<CreateProjectInput>({
		name: "",
		description: "",
	});

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

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto py-8 px-4">
				<div className="flex items-center justify-between mb-8">
					<div></div>
					<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
						<DialogTrigger asChild>
							<Button>
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

				{isLoading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{[1, 2, 3].map((i) => (
							<Card key={i} className="animate-pulse">
								<CardHeader>
									<div className="h-5 bg-muted rounded w-3/4"></div>
									<div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
								</CardHeader>
							</Card>
						))}
					</div>
				) : projects.length === 0 ? (
					<Card className="text-center py-12">
						<CardContent>
							<Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
							<h3 className="text-lg font-medium mb-2">No projects yet</h3>
							<p className="text-muted-foreground mb-4">
								Create your first project to get started
							</p>
							<Button onClick={() => setIsCreateOpen(true)}>
								<Plus className="mr-2 h-4 w-4" />
								Create Project
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{projects.map((project) => {
							const stats = statsMap.get(project.id);
							return (
								<Card
									key={project.id}
									className="cursor-pointer hover:border-primary/50 transition-colors group"
									onClick={() => navigate(`/project/${project.id}`)}
								>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div className="flex items-center gap-2">
												<Database className="h-5 w-5 text-primary" />
												<CardTitle className="text-lg">{project.name}</CardTitle>
											</div>
											<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8"
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
													className="h-8 w-8 text-destructive hover:text-destructive"
													onClick={(e) => handleDelete(e, project.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
										<CardDescription className="line-clamp-2">
											{project.description || "No description"}
										</CardDescription>
									</CardHeader>
									<CardContent className="pt-0">
										<div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
											<div className="flex items-center gap-1.5" title="Tables">
												<Table2 className="h-3.5 w-3.5" />
												<span>{stats ? formatNumber(stats.tableCount) : "-"}</span>
											</div>
											<div className="flex items-center gap-1.5" title="Total rows">
												<Rows3 className="h-3.5 w-3.5" />
												<span>{stats ? formatNumber(stats.totalRows) : "-"}</span>
											</div>
											<div className="flex items-center gap-1.5" title="Conversations">
												<MessageSquare className="h-3.5 w-3.5" />
												<span>{stats ? formatNumber(stats.conversationCount) : "-"}</span>
											</div>
											<div className="flex items-center gap-1.5" title="Saved queries">
												<FileCode className="h-3.5 w-3.5" />
												<span>{stats ? formatNumber(stats.savedQueryCount) : "-"}</span>
											</div>
										</div>
										<p className="text-xs text-muted-foreground">
											Updated {new Date(project.updatedAt).toLocaleDateString()}
										</p>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
