import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-dialog";
import { FileText, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadDocument, vectorizeDocument } from "@/lib/tauri";

const MAX_AUTO_VECTORIZE_SIZE = 20 * 1024 * 1024; // 20MB

interface DocumentUploadDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentUploadDialog({
  projectId,
  open: isOpen,
  onOpenChange,
}: DocumentUploadDialogProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const doc = await uploadDocument(projectId, selectedFile!);
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
      handleClose();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Upload failed");
    },
  });

  const handleSelectFile = async () => {
    try {
      const file = await open({
        multiple: false,
        filters: [
          {
            name: "Documents",
            extensions: ["txt", "md", "markdown", "docx", "pdf"],
          },
        ],
      });

      if (file) {
        setSelectedFile(file);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to open file dialog:", err);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError(null);
    onOpenChange(false);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate();
    }
  };

  const getFileName = (path: string) => {
    return path.split("/").pop() || path;
  };

  const getFileExtension = (path: string) => {
    const name = getFileName(path);
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return ext;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Upload a document to enable AI-powered search and analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSelectFile}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              {selectedFile ? "Change File" : "Select File"}
            </Button>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-3 px-3 py-2 bg-muted rounded-md">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getFileName(selectedFile)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getFileExtension(selectedFile).toUpperCase()} document
                </p>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Supported formats: TXT, Markdown, DOCX, PDF
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
