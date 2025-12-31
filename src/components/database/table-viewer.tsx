import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataGrid, type SortState } from "./data-grid";
import { queryTable } from "@/lib/tauri";

interface TableViewerProps {
  projectId: string;
  tableName: string;
  isVectorized?: boolean;
  onVectorize?: () => void;
}

const PAGE_SIZES = [50, 100, 250, 500, 1000];

export function TableViewer({ projectId, tableName, isVectorized, onVectorize }: TableViewerProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [sort, setSort] = useState<SortState | null>(null);

  // Reset state when table changes
  const prevTableName = useRef(tableName);
  useEffect(() => {
    if (prevTableName.current !== tableName) {
      setPage(0);
      setSort(null);
      prevTableName.current = tableName;
    }
  }, [tableName]);

  // Fetch table data
  const {
    data: result,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["table-data", projectId, tableName, page, pageSize, sort?.column, sort?.desc],
    queryFn: () => queryTable(projectId, tableName, page, pageSize, sort?.column, sort?.desc),
    enabled: !!tableName,
  });

  const handleSort = (column: string) => {
    setPage(0); // Reset to first page when sorting
    setSort((prev) => {
      if (prev?.column === column) {
        // Toggle direction or clear
        if (prev.desc) {
          return null; // Clear sort
        }
        return { column, desc: true };
      }
      return { column, desc: false };
    });
  };

  const totalRows = result?.rowCount || 0;
  const hasMore = totalRows === pageSize;
  const columns = result?.columns || [];
  const rows = (result?.rows || []) as Record<string, unknown>[];

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setPage(0);
  };

  const handleFirstPage = () => setPage(0);
  const handlePrevPage = () => setPage((p) => Math.max(0, p - 1));
  const handleNextPage = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{tableName}</h2>
          {onVectorize && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`p-1.5 rounded-md hover:bg-muted transition-colors ${
                    isVectorized
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={onVectorize}
                >
                  <Sparkles className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {isVectorized
                  ? "Vectorized - Click to manage"
                  : "Enable vectorization"}
              </TooltipContent>
            </Tooltip>
          )}
          {isFetching && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden p-3">
        <DataGrid
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          sort={sort}
          onSort={handleSort}
        />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-3 border-t shrink-0 bg-muted/30">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} • Showing {rows.length} rows
            {result?.executionTimeMs && (
              <span className="ml-2">({result.executionTimeMs}ms)</span>
            )}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleFirstPage}
              disabled={page === 0}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevPage}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleNextPage}
              disabled={!hasMore}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
