import { Download, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUpdateStore } from "@/stores/update-store";

export function UpdateBanner() {
	const {
		status,
		progress,
		updateInfo,
		dismissed,
		downloadAndInstall,
		restartApp,
		dismiss,
	} = useUpdateStore();

	// Only show banner for actionable states and if not dismissed
	if (dismissed || !["available", "downloading", "ready"].includes(status)) {
		return null;
	}

	return (
		<div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
			<div className="glass-card border shadow-lg rounded-xl p-4">
				<div className="flex items-start gap-3">
					<div className="flex-1 min-w-0">
						{status === "available" && (
							<>
								<p className="text-sm font-medium">
									Update available: v{updateInfo?.version}
								</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									A new version is ready to download
								</p>
							</>
						)}

						{status === "downloading" && (
							<>
								<p className="text-sm font-medium">Downloading update...</p>
								<div className="mt-2">
									<Progress value={progress} className="h-1.5" />
									<p className="text-xs text-muted-foreground mt-1 text-right">
										{progress}%
									</p>
								</div>
							</>
						)}

						{status === "ready" && (
							<>
								<p className="text-sm font-medium">Update ready to install</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									Restart to apply the update
								</p>
							</>
						)}
					</div>

					{status === "available" && (
						<div className="flex items-center gap-1">
							<Button size="sm" onClick={downloadAndInstall} className="gap-1.5">
								<Download className="h-3.5 w-3.5" />
								Update
							</Button>
							<Button
								size="icon"
								variant="ghost"
								className="h-8 w-8"
								onClick={dismiss}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					)}

					{status === "ready" && (
						<Button size="sm" onClick={restartApp} className="gap-1.5">
							<RefreshCw className="h-3.5 w-3.5" />
							Restart
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
