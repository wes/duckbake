import { Check, Moon, Sun, Monitor } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { UpdateChecker } from "./update-checker";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import {
	useThemeStore,
	themeStyles,
	themeModes,
	type ThemeStyle,
	type ThemeMode,
} from "@/stores/theme-store";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
	const { mode, style, setMode, setStyle } = useThemeStore();

	const getModeIcon = (modeId: ThemeMode) => {
		switch (modeId) {
			case "light":
				return <Sun className="h-4 w-4" />;
			case "dark":
				return <Moon className="h-4 w-4" />;
			case "system":
				return <Monitor className="h-4 w-4" />;
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
					<DialogDescription>
						Customize how DuckBake looks on your device
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 pt-2">
					{/* Theme Style */}
					<div className="space-y-3">
						<label className="text-sm font-medium text-foreground/80">
							Theme Style
						</label>
						<div className="grid grid-cols-2 gap-2">
							{themeStyles.map((themeStyle) => (
								<button
									key={themeStyle.id}
									onClick={() => setStyle(themeStyle.id)}
									className={cn(
										"relative flex flex-col items-start gap-1 rounded-lg p-3 text-left transition-all",
										"border hover:border-primary/50",
										style === themeStyle.id
											? "border-primary bg-primary/10"
											: "border-border bg-card/50 hover:bg-card"
									)}
								>
									{style === themeStyle.id && (
										<div className="absolute top-2 right-2">
											<Check className="h-3.5 w-3.5 text-primary" />
										</div>
									)}
									<ThemePreview themeId={themeStyle.id} />
									<span className="font-medium text-sm mt-1">
										{themeStyle.name}
									</span>
								</button>
							))}
						</div>
					</div>

					{/* Color Mode */}
					<div className="space-y-3">
						<label className="text-sm font-medium text-foreground/80">
							Color Mode
						</label>
						<div className="flex gap-2">
							{themeModes.map((themeMode) => (
								<Button
									key={themeMode.id}
									variant={mode === themeMode.id ? "default" : "outline"}
									size="sm"
									onClick={() => setMode(themeMode.id)}
									className={cn(
										"flex-1 gap-2",
										mode === themeMode.id && "glass-button"
									)}
								>
									{getModeIcon(themeMode.id)}
									{themeMode.name}
								</Button>
							))}
						</div>
					</div>

					<Separator />

					{/* Updates */}
					<UpdateChecker />
				</div>
			</DialogContent>
		</Dialog>
	);
}

function ThemePreview({ themeId }: { themeId: ThemeStyle }) {
	if (themeId === "glass") {
		return (
			<div className="w-full h-12 rounded-md bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-pink-500/20 border border-white/10 flex items-center justify-center overflow-hidden">
				<div className="w-6 h-4 rounded bg-white/20 backdrop-blur-sm border border-white/20" />
				<div className="w-6 h-4 rounded bg-white/15 backdrop-blur-sm border border-white/15 -ml-1.5 mt-1.5" />
			</div>
		);
	}

	if (themeId === "kodama") {
		return (
			<div className="w-full h-12 rounded-sm bg-[#d4c9a8] border border-[#8b7355] flex items-center justify-center gap-1 overflow-hidden">
				<div
					className="w-6 h-4 rounded-sm bg-[#e8dfc4] border border-[#8b7355]"
					style={{ boxShadow: "1px 1px 0 #8b735580" }}
				/>
				<div
					className="w-6 h-4 rounded-sm bg-[#e8dfc4] border border-[#8b7355]"
					style={{ boxShadow: "1px 1px 0 #8b735580" }}
				/>
			</div>
		);
	}

	if (themeId === "catppuccin") {
		return (
			<div className="w-full h-12 rounded bg-[#1e1e2e] border border-[#45475a] flex items-center justify-center gap-1.5 overflow-hidden">
				<div
					className="w-6 h-4 rounded bg-[#313244] border border-[#45475a]"
					style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}
				/>
				<div
					className="w-6 h-4 rounded bg-[#cba6f7]"
					style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}
				/>
			</div>
		);
	}

	// Mono theme
	return (
		<div className="w-full h-12 rounded-none bg-neutral-900 border border-neutral-700 flex items-center justify-center gap-0.5 overflow-hidden">
			<div className="w-6 h-4 bg-neutral-800 border border-neutral-600" />
			<div className="w-6 h-4 bg-neutral-800 border border-neutral-600" />
		</div>
	);
}
