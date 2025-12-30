import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
	Upload,
	FileSpreadsheet,
	CheckCircle,
	AlertCircle,
	Loader2,
} from "lucide-react";
import { importFile } from "@/lib/tauri";

interface DropZoneProps {
	projectId: string;
}

interface ImportStatus {
	fileName: string;
	status: "pending" | "importing" | "success" | "error";
	tableName?: string;
	error?: string;
}

const VALID_EXTENSIONS = [
	"csv",
	"tsv",
	"json",
	"jsonl",
	"ndjson",
	"parquet",
	"pq",
	"xlsx",
	"xls",
];

export function DropZone({ projectId }: DropZoneProps) {
	const queryClient = useQueryClient();
	const [isDragging, setIsDragging] = useState(false);
	const [imports, setImports] = useState<ImportStatus[]>([]);

	const importFileMutation = useMutation({
		mutationFn: async ({
			filePath,
			tableName,
		}: {
			filePath: string;
			tableName: string;
		}) => {
			return importFile(projectId, filePath, tableName, "create");
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tables", projectId] });
		},
	});

	const processFile = async (filePath: string) => {
		const fileName = filePath.split("/").pop() || filePath;
		const ext = fileName.split(".").pop()?.toLowerCase();

		if (!ext || !VALID_EXTENSIONS.includes(ext)) {
			return; // Skip invalid files
		}

		// Generate table name from file name
		const tableName = fileName
			.replace(/\.[^/.]+$/, "") // Remove extension
			.replace(/[^a-zA-Z0-9_]/g, "_") // Replace invalid chars
			.replace(/^_+|_+$/g, "") // Trim underscores
			.replace(/_+/g, "_") // Collapse multiple underscores
			.toLowerCase();

		setImports((prev) => [
			...prev,
			{ fileName, status: "importing", tableName },
		]);

		try {
			await importFileMutation.mutateAsync({ filePath, tableName });

			setImports((prev) =>
				prev.map((i) =>
					i.fileName === fileName ? { ...i, status: "success" } : i,
				),
			);

			// Clear success after 3 seconds
			setTimeout(() => {
				setImports((prev) => prev.filter((i) => i.fileName !== fileName));
			}, 3000);
		} catch (err) {
			setImports((prev) =>
				prev.map((i) =>
					i.fileName === fileName
						? {
								...i,
								status: "error",
								error: err instanceof Error ? err.message : "Import failed",
							}
						: i,
				),
			);

			// Clear error after 5 seconds
			setTimeout(() => {
				setImports((prev) => prev.filter((i) => i.fileName !== fileName));
			}, 5000);
		}
	};

	useEffect(() => {
		const webview = getCurrentWebview();

		const setupListener = async () => {
			const unlisten = await webview.onDragDropEvent((event) => {
				if (event.payload.type === "enter" || event.payload.type === "over") {
					setIsDragging(true);
				} else if (event.payload.type === "leave") {
					setIsDragging(false);
				} else if (event.payload.type === "drop") {
					setIsDragging(false);
					// Process all dropped files
					for (const path of event.payload.paths) {
						processFile(path);
					}
				}
			});

			return unlisten;
		};

		const unlistenPromise = setupListener();

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, [projectId]);

	return (
		<>
			{/* Full-window drop overlay */}
			{isDragging && (
				<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
					<div className="border-2 border-dashed border-primary rounded-xl p-12 bg-primary/5">
						<div className="flex flex-col items-center gap-4">
							<Upload className="h-16 w-16 text-primary animate-bounce" />
							<p className="text-xl font-medium text-primary">
								Drop files to import
							</p>
							<p className="text-sm text-muted-foreground">
								CSV, Excel, Parquet, JSON
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Import Status Toast */}
			{imports.length > 0 && (
				<div className="fixed bottom-4 right-4 z-50 space-y-2 min-w-64">
					{imports.map((imp) => (
						<div
							key={imp.fileName}
							className={`
                flex items-center gap-2 p-3 rounded-lg shadow-lg text-sm
                ${imp.status === "importing" ? "bg-card border" : ""}
                ${imp.status === "success" ? "bg-green-500 text-white" : ""}
                ${imp.status === "error" ? "bg-destructive text-destructive-foreground" : ""}
              `}
						>
							{imp.status === "importing" && (
								<Loader2 className="h-4 w-4 animate-spin shrink-0" />
							)}
							{imp.status === "success" && (
								<CheckCircle className="h-4 w-4 shrink-0" />
							)}
							{imp.status === "error" && (
								<AlertCircle className="h-4 w-4 shrink-0" />
							)}
							<FileSpreadsheet className="h-4 w-4 shrink-0" />
							<div className="flex-1 min-w-0">
								<p className="truncate font-medium">{imp.fileName}</p>
								{imp.status === "success" && imp.tableName && (
									<p className="text-xs opacity-80">
										Imported as "{imp.tableName}"
									</p>
								)}
								{imp.status === "error" && imp.error && (
									<p className="text-xs opacity-80 truncate">{imp.error}</p>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</>
	);
}
