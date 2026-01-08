import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import {
	Upload,
	FileSpreadsheet,
	FileText,
	CheckCircle,
	AlertCircle,
	Loader2,
} from "lucide-react";
import { importFile, uploadDocument, vectorizeDocument } from "@/lib/tauri";
import { useProjectStore, useDocumentStore, useAppStore } from "@/stores";

const MAX_AUTO_VECTORIZE_SIZE = 20 * 1024 * 1024; // 20MB

interface DropZoneProps {
	projectId: string;
}

interface ImportStatus {
	fileName: string;
	status: "pending" | "importing" | "success" | "error";
	type: "data" | "document";
	tableName?: string;
	error?: string;
}

const DATA_EXTENSIONS = [
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

const DOCUMENT_EXTENSIONS = ["txt", "md", "markdown", "docx", "pdf"];

export function DropZone({ projectId }: DropZoneProps) {
	const queryClient = useQueryClient();
	const [isDragging, setIsDragging] = useState(false);
	const [imports, setImports] = useState<ImportStatus[]>([]);
	const { selectTable } = useProjectStore();
	const { selectDocument } = useDocumentStore();
	const { setActiveTab } = useAppStore();

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

	const uploadDocumentMutation = useMutation({
		mutationFn: async ({ filePath }: { filePath: string }) => {
			const doc = await uploadDocument(projectId, filePath);
			// Auto-vectorize documents under 20MB
			if (doc.fileSize < MAX_AUTO_VECTORIZE_SIZE) {
				vectorizeDocument(projectId, doc.id).catch(() => {
					// Vectorization errors are non-fatal, ignore them
				});
			}
			return doc;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
		},
	});

	const processFile = async (filePath: string) => {
		const fileName = filePath.split("/").pop() || filePath;
		const ext = fileName.split(".").pop()?.toLowerCase();

		if (!ext) return;

		const isDataFile = DATA_EXTENSIONS.includes(ext);
		const isDocumentFile = DOCUMENT_EXTENSIONS.includes(ext);

		if (!isDataFile && !isDocumentFile) {
			// Show error for unsupported file types
			setImports((prev) => [
				...prev,
				{
					fileName,
					status: "error",
					type: "data",
					error: `Unsupported file type: .${ext}`,
				},
			]);
			setTimeout(() => {
				setImports((prev) => prev.filter((i) => i.fileName !== fileName));
			}, 5000);
			return;
		}

		if (isDataFile) {
			// Generate table name from file name
			const tableName = fileName
				.replace(/\.[^/.]+$/, "") // Remove extension
				.replace(/[^a-zA-Z0-9_]/g, "_") // Replace invalid chars
				.replace(/^_+|_+$/g, "") // Trim underscores
				.replace(/_+/g, "_") // Collapse multiple underscores
				.toLowerCase();

			setImports((prev) => [
				...prev,
				{ fileName, status: "importing", type: "data", tableName },
			]);

			try {
				await importFileMutation.mutateAsync({ filePath, tableName });

				setImports((prev) =>
					prev.map((i) =>
						i.fileName === fileName ? { ...i, status: "success" } : i,
					),
				);

				// Navigate to the imported table
				selectTable(tableName);
				setActiveTab("browser");

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

				setTimeout(() => {
					setImports((prev) => prev.filter((i) => i.fileName !== fileName));
				}, 5000);
			}
		} else if (isDocumentFile) {
			setImports((prev) => [
				...prev,
				{ fileName, status: "importing", type: "document" },
			]);

			try {
				const doc = await uploadDocumentMutation.mutateAsync({ filePath });

				setImports((prev) =>
					prev.map((i) =>
						i.fileName === fileName ? { ...i, status: "success" } : i,
					),
				);

				// Navigate to the uploaded document
				selectDocument(doc.id);
				setActiveTab("browser");

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
									error: err instanceof Error ? err.message : "Upload failed",
								}
							: i,
					),
				);

				setTimeout(() => {
					setImports((prev) => prev.filter((i) => i.fileName !== fileName));
				}, 5000);
			}
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
							<div className="flex gap-6 text-sm text-muted-foreground">
								<div className="flex items-center gap-2">
									<FileSpreadsheet className="h-4 w-4" />
									<span>CSV, Excel, Parquet, JSON</span>
								</div>
								<div className="flex items-center gap-2">
									<FileText className="h-4 w-4" />
									<span>PDF, DOCX, TXT, MD</span>
								</div>
							</div>
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
							{imp.type === "data" ? (
								<FileSpreadsheet className="h-4 w-4 shrink-0" />
							) : (
								<FileText className="h-4 w-4 shrink-0" />
							)}
							<div className="flex-1 min-w-0">
								<p className="truncate font-medium">{imp.fileName}</p>
								{imp.status === "success" && imp.type === "data" && imp.tableName && (
									<p className="text-xs opacity-80">
										Imported as "{imp.tableName}"
									</p>
								)}
								{imp.status === "success" && imp.type === "document" && (
									<p className="text-xs opacity-80">Added to documents</p>
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
