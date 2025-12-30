import { useMemo, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

interface DataGridProps {
  columns: string[];
  rows: Record<string, unknown>[];
  isLoading?: boolean;
}

export function DataGrid({ columns, rows, isLoading }: DataGridProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Create column definitions dynamically
  const columnDefs = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    const helper = createColumnHelper<Record<string, unknown>>();
    return columns.map((col) =>
      helper.accessor((row) => row[col], {
        id: col,
        header: col,
        cell: (info) => {
          const value = info.getValue();
          if (value === null || value === undefined) {
            return <span className="text-muted-foreground italic">null</span>;
          }
          if (typeof value === "boolean") {
            return value ? "true" : "false";
          }
          if (typeof value === "object") {
            return JSON.stringify(value);
          }
          return String(value);
        },
        size: 150,
        minSize: 80,
        maxSize: 400,
      })
    );
  }, [columns]);

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows: tableRows } = table.getRowModel();

  // Virtualize rows
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data to display
      </div>
    );
  }

  return (
    <div
      ref={tableContainerRef}
      className="h-full overflow-auto border rounded-md"
    >
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-muted border-b">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap border-r last:border-r-0"
                  style={{ width: header.getSize() }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: `${paddingTop}px` }} />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const row = tableRows[virtualRow.index];
            return (
              <tr
                key={row.id}
                className={cn(
                  "border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                  virtualRow.index % 2 === 0 ? "bg-background" : "bg-muted/20"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-3 py-2 whitespace-nowrap border-r last:border-r-0 max-w-[300px] truncate"
                    style={{ width: cell.column.getSize() }}
                    title={String(cell.getValue() ?? "")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: `${paddingBottom}px` }} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
