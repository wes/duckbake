import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  RefreshCw,
  Columns,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataGrid } from "./data-grid";
import { queryTable, getTableSchema } from "@/lib/tauri";

interface TableViewerProps {
  projectId: string;
  tableName: string;
}

const PAGE_SIZES = [50, 100, 250, 500, 1000];

export function TableViewer({ projectId, tableName }: TableViewerProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [showSchema, setShowSchema] = useState(false);

  // Fetch table schema
  const { data: schema } = useQuery({
    queryKey: ["table-schema", projectId, tableName],
    queryFn: () => getTableSchema(projectId, tableName),
    enabled: !!tableName,
  });

  // Fetch table data
  const {
    data: result,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["table-data", projectId, tableName, page, pageSize],
    queryFn: () => queryTable(projectId, tableName, page, pageSize),
    enabled: !!tableName,
    placeholderData: (prev) => prev,
  });

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
          {isFetching && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSchema(!showSchema)}
          >
            <Columns className="h-4 w-4 mr-1" />
            Schema
          </Button>
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

      {/* Schema Panel */}
      {showSchema && schema && (
        <div className="border-b p-3 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Columns className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {schema.columns.length} Columns
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {schema.columns.map((col) => (
              <div
                key={col.name}
                className="text-xs bg-background border rounded px-2 py-1"
              >
                <span className="font-mono font-medium">{col.name}</span>
                <span className="text-muted-foreground ml-1">
                  {col.dataType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden p-3">
        <DataGrid columns={columns} rows={rows} isLoading={isLoading} />
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
