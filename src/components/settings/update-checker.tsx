import { Download, Check, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUpdateStore } from "@/stores/update-store";

export function UpdateChecker() {
	const {
		status,
		progress,
		updateInfo,
		error,
		checkForUpdates,
		downloadAndInstall,
		restartApp,
	} = useUpdateStore();

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium">App Updates</p>
					<p className="text-xs text-muted-foreground">
						{status === "up-to-date" && "You're on the latest version"}
						{status === "available" && `Version ${updateInfo?.version} is available`}
						{status === "checking" && "Checking for updates..."}
						{status === "downloading" && "Downloading update..."}
						{status === "ready" && "Update ready to install"}
						{status === "error" && "Update check failed"}
						{status === "idle" && "Check for new versions"}
					</p>
				</div>

				{status === "idle" && (
					<Button variant="outline" size="sm" onClick={checkForUpdates}>
						<RefreshCw className="h-4 w-4 mr-2" />
						Check
					</Button>
				)}

				{status === "checking" && (
					<Button variant="outline" size="sm" disabled>
						<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
						Checking...
					</Button>
				)}

				{status === "up-to-date" && (
					<Button variant="outline" size="sm" onClick={checkForUpdates}>
						<Check className="h-4 w-4 mr-2 text-green-500" />
						Up to date
					</Button>
				)}

				{status === "available" && (
					<Button size="sm" onClick={downloadAndInstall}>
						<Download className="h-4 w-4 mr-2" />
						Update
					</Button>
				)}

				{status === "ready" && (
					<Button size="sm" onClick={restartApp}>
						<RefreshCw className="h-4 w-4 mr-2" />
						Restart
					</Button>
				)}

				{status === "error" && (
					<Button variant="outline" size="sm" onClick={checkForUpdates}>
						<AlertCircle className="h-4 w-4 mr-2 text-destructive" />
						Retry
					</Button>
				)}
			</div>

			{status === "downloading" && (
				<div className="space-y-1">
					<Progress value={progress} className="h-2" />
					<p className="text-xs text-muted-foreground text-right">{progress}%</p>
				</div>
			)}

			{status === "error" && error && (
				<p className="text-xs text-destructive">{error}</p>
			)}

			{status === "available" && updateInfo?.body && (
				<div className="text-xs text-muted-foreground border rounded-md p-2 max-h-20 overflow-y-auto">
					<p className="font-medium mb-1">What's new:</p>
					<p className="whitespace-pre-wrap">{updateInfo.body}</p>
				</div>
			)}
		</div>
	);
}
