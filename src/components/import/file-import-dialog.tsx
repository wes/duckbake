import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-dialog";
import { FileSpreadsheet, Upload, Table, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { previewImport, importFile } from "@/lib/tauri";
import type { ImportPreview, ImportMode } from "@/types";

interface FileImportDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileImportDialog({
  projectId,
  open: isOpen,
  onOpenChange,
}: FileImportDialogProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [tableName, setTableName] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("create");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: () =>
      importFile(projectId, selectedFile!, tableName, importMode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", projectId] });
      handleClose();
    },
  });

  const handleSelectFile = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [
          {
            name: "Data Files",
            extensions: [
              "csv",
              "tsv",
              "json",
              "jsonl",
              "ndjson",
              "parquet",
              "pq",
              "xlsx",
              "xls",
            ],
          },
        ],
      });

      if (file) {
        setSelectedFile(file);
        setPreviewError(null);
        setIsLoadingPreview(true);

        try {
          const previewData = await previewImport(projectId, file);
          setPreview(previewData);

          // Generate default table name from file name
          const fileName = previewData.fileName
            .replace(/\.[^/.]+$/, "") // Remove extension
            .replace(/[^a-zA-Z0-9_]/g, "_") // Replace invalid chars
            .toLowerCase();
          setTableName(fileName);
        } catch (err) {
          setPreviewError(
            err instanceof Error ? err.message : "Failed to preview file"
          );
          setPreview(null);
        } finally {
          setIsLoadingPreview(false);
        }
      }
    } catch (err) {
      console.error("Failed to open file dialog:", err);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setTableName("");
    setImportMode("create");
    setPreviewError(null);
    onOpenChange(false);
  };

  const handleImport = () => {
    if (selectedFile && tableName.trim()) {
      importMutation.mutate();
    }
  };

  const canImport =
    selectedFile && tableName.trim() && preview && !importMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data File
          </DialogTitle>
          <DialogDescription>
            Import CSV, Excel, Parquet, or JSON files into your project
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* File Selection */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSelectFile}
              className="flex-1"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {selectedFile ? "Change File" : "Select File"}
            </Button>
            {selectedFile && (
              <div className="flex-1 flex items-center px-3 bg-muted rounded-md text-sm truncate">
                {selectedFile.split("/").pop()}
              </div>
            )}
          </div>

          {/* Preview Error */}
          {previewError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{previewError}</span>
            </div>
          )}

          {/* Loading Preview */}
          {isLoadingPreview && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Preview */}
          {preview && !isLoadingPreview && (
            <>
              {/* File Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Type: {preview.fileType.toUpperCase()}</span>
                <span>Columns: {preview.columns.length}</span>
                {preview.totalRowsEstimate && (
                  <span>
                    Rows: {preview.totalRowsEstimate.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Table Name & Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Table Name</label>
                  <Input
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="my_table"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Import Mode</label>
                  <Select
                    value={importMode}
                    onValueChange={(v) => setImportMode(v as ImportMode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">
                        Create New Table
                      </SelectItem>
                      <SelectItem value="replace">
                        Replace Existing
                      </SelectItem>
                      <SelectItem value="append">
                        Append to Existing
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Column Preview */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  <span className="text-sm font-medium">Column Preview</span>
                </div>
                <div className="border rounded-md">
                  <div className="bg-muted px-3 py-2 border-b flex gap-4 text-xs font-medium text-muted-foreground">
                    <span className="w-48">Column Name</span>
                    <span>Detected Type</span>
                  </div>
                  <ScrollArea className="h-32">
                    <div className="divide-y">
                      {preview.columns.map((col, i) => (
                        <div key={i} className="px-3 py-2 flex gap-4 text-sm">
                          <span className="w-48 font-mono truncate">
                            {col.name}
                          </span>
                          <span className="text-muted-foreground">
                            {col.inferredType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Sample Data Preview */}
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  Sample Data (first {preview.sampleRows.length} rows)
                </span>
                <div className="border rounded-md overflow-hidden">
                  <ScrollArea className="h-48">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            {preview.columns.map((col, i) => (
                              <th
                                key={i}
                                className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                              >
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {preview.sampleRows.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate"
                                >
                                  {cell === null ? (
                                    <span className="text-muted-foreground italic">
                                      null
                                    </span>
                                  ) : (
                                    String(cell)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!canImport}
          >
            {importMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>

        {importMutation.isError && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md mt-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              {importMutation.error instanceof Error
                ? importMutation.error.message
                : "Import failed"}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
