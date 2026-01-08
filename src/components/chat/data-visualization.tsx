import { useMemo } from "react";
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	PieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import { Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores";
import type { QueryResult } from "@/types";

export type VizType = "table" | "bar" | "line" | "pie";

export interface VisualizationConfig {
	type: VizType;
	xKey?: string;
	yKey?: string;
	title?: string;
}

interface DataVisualizationProps {
	result: QueryResult;
	config: VisualizationConfig;
	description?: string;
	sql?: string;
}

const COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

export function DataVisualization({
	result,
	config,
	description,
	sql,
}: DataVisualizationProps) {
	const { type, xKey, yKey } = config;
	const openInQueryEditor = useAppStore((s) => s.openInQueryEditor);

	// Auto-detect keys if not provided
	const detectedKeys = useMemo(() => {
		if (result.columns.length === 0) return { x: "", y: "" };

		// For pie charts, first column is label, second is value
		// For bar/line, first column is x-axis, rest are y values
		const numericColumns = result.columns.filter((col) => {
			if (result.rows.length === 0) return false;
			const sample = (result.rows[0] as Record<string, unknown>)[col];
			return typeof sample === "number";
		});

		const stringColumns = result.columns.filter((col) => {
			if (result.rows.length === 0) return false;
			const sample = (result.rows[0] as Record<string, unknown>)[col];
			return typeof sample === "string";
		});

		return {
			x: xKey || stringColumns[0] || result.columns[0],
			y: yKey || numericColumns[0] || result.columns[1] || result.columns[0],
		};
	}, [result, xKey, yKey]);

	// Prepare data for charts
	const chartData = useMemo(() => {
		return result.rows.map((row) => {
			const record = row as Record<string, unknown>;
			const item: Record<string, unknown> = {};
			for (const col of result.columns) {
				item[col] = record[col];
			}
			return item;
		});
	}, [result]);

	if (result.rows.length === 0) {
		return (
			<div className="p-4 bg-muted/50 rounded-lg">
				{description && <p className="text-sm mb-2">{description}</p>}
				<p className="text-sm text-muted-foreground">No data returned.</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{description && <p className="text-sm">{description}</p>}

			<div className="bg-muted/30 rounded-lg p-3 border">
				<div className="flex items-center justify-between mb-2">
					<div className="text-xs text-muted-foreground">
						{result.rowCount} rows in {result.executionTimeMs}ms
					</div>
					{sql && (
						<Button
							variant="ghost"
							size="sm"
							className="h-6 px-2 text-xs gap-1"
							onClick={() => openInQueryEditor(sql)}
						>
							<Code className="h-3 w-3" />
							Open in Editor
						</Button>
					)}
				</div>

				{type === "table" && <DataTable result={result} />}

				{type === "bar" && (
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={chartData}
								margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									className="stroke-border"
								/>
								<XAxis
									dataKey={detectedKeys.x}
									tick={{ fontSize: 11 }}
									className="text-muted-foreground"
								/>
								<YAxis
									tick={{ fontSize: 11 }}
									className="text-muted-foreground"
									tickFormatter={formatLargeNumber}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "var(--popover)",
										borderColor: "var(--border)",
										borderRadius: "8px",
										fontSize: "12px",
									}}
									cursor={{ fill: "var(--muted)", opacity: 0.3 }}
									formatter={(value?: number) => [
										formatLargeNumber(value ?? 0),
										detectedKeys.y,
									]}
								/>
								<Legend />
								<Bar
									dataKey={detectedKeys.y}
									fill="var(--chart-1)"
									radius={[4, 4, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				)}

				{type === "line" && (
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={chartData}
								margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
							>
								<CartesianGrid
									strokeDasharray="3 3"
									className="stroke-border"
								/>
								<XAxis
									dataKey={detectedKeys.x}
									tick={{ fontSize: 11 }}
									className="text-muted-foreground"
								/>
								<YAxis
									tick={{ fontSize: 11 }}
									className="text-muted-foreground"
									tickFormatter={formatLargeNumber}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "var(--popover)",
										borderColor: "var(--border)",
										borderRadius: "8px",
										fontSize: "12px",
									}}
									formatter={(value?: number) => [
										formatLargeNumber(value ?? 0),
										detectedKeys.y,
									]}
								/>
								<Legend />
								<Line
									type="monotone"
									dataKey={detectedKeys.y}
									stroke="var(--chart-1)"
									strokeWidth={2}
									dot={{ fill: "var(--chart-1)" }}
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				)}

				{type === "pie" && (
					<div className="h-64">
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={chartData}
									dataKey={detectedKeys.y}
									nameKey={detectedKeys.x}
									cx="50%"
									cy="50%"
									outerRadius={80}
									label={({ name, percent }) =>
										`${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
									}
									labelLine={{ stroke: "var(--muted-foreground)" }}
								>
									{chartData.map((_, index) => (
										<Cell
											key={`cell-${index}`}
											fill={COLORS[index % COLORS.length]}
										/>
									))}
								</Pie>
								<Tooltip
									contentStyle={{
										backgroundColor: "var(--popover)",
										borderColor: "var(--border)",
										borderRadius: "8px",
										fontSize: "12px",
									}}
								/>
								<Legend />
							</PieChart>
						</ResponsiveContainer>
					</div>
				)}
			</div>
		</div>
	);
}

function DataTable({ result }: { result: QueryResult }) {
	const displayRows = result.rows.slice(0, 50);

	return (
		<div className="overflow-x-auto max-h-80 overflow-y-auto">
			<table className="min-w-full border-collapse text-xs">
				<thead className="sticky top-0 bg-muted">
					<tr>
						{result.columns.map((col) => (
							<th
								key={col}
								className="border border-border px-3 py-2 text-left font-medium"
							>
								{col}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{displayRows.map((row, i) => {
						const record = row as Record<string, unknown>;
						return (
							<tr key={i} className="hover:bg-muted/50">
								{result.columns.map((col) => (
									<td key={col} className="border border-border px-3 py-1.5">
										{formatCell(record[col])}
									</td>
								))}
							</tr>
						);
					})}
				</tbody>
			</table>
			{result.rows.length > 50 && (
				<p className="text-xs mt-2 text-center">
					Showing 50 of {result.rows.length} rows
				</p>
			)}
		</div>
	);
}

function formatCell(value: unknown): string {
	if (value === null || value === undefined) return "—";
	if (typeof value === "number") return value.toLocaleString();
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

function formatLargeNumber(value: number): string {
	if (Math.abs(value) >= 1_000_000_000) {
		return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
	}
	if (Math.abs(value) >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
	}
	if (Math.abs(value) >= 1_000) {
		return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
	}
	return value.toLocaleString();
}
