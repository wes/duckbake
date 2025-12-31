import { create } from "zustand";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
	| "idle"
	| "checking"
	| "available"
	| "downloading"
	| "ready"
	| "up-to-date"
	| "error";

interface UpdateInfo {
	version: string;
	body?: string;
}

interface UpdateState {
	status: UpdateStatus;
	progress: number;
	updateInfo: UpdateInfo | null;
	error: string | null;
	update: Update | null;
	dismissed: boolean;
	checkForUpdates: () => Promise<void>;
	downloadAndInstall: () => Promise<void>;
	restartApp: () => Promise<void>;
	dismiss: () => void;
	reset: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
	status: "idle",
	progress: 0,
	updateInfo: null,
	error: null,
	update: null,
	dismissed: false,

	checkForUpdates: async () => {
		set({ status: "checking", error: null, dismissed: false });

		try {
			const updateResult = await check();

			if (updateResult) {
				set({
					update: updateResult,
					updateInfo: {
						version: updateResult.version,
						body: updateResult.body,
					},
					status: "available",
				});
			} else {
				set({ status: "up-to-date" });
			}
		} catch (err) {
			console.error("Update check failed:", err);
			set({
				error: err instanceof Error ? err.message : "Failed to check for updates",
				status: "error",
			});
		}
	},

	downloadAndInstall: async () => {
		const { update } = get();
		if (!update) return;

		set({ status: "downloading", progress: 0 });

		try {
			let downloaded = 0;
			let contentLength = 0;

			await update.downloadAndInstall((event) => {
				switch (event.event) {
					case "Started":
						contentLength = event.data.contentLength ?? 0;
						break;
					case "Progress":
						downloaded += event.data.chunkLength;
						if (contentLength > 0) {
							set({ progress: Math.round((downloaded / contentLength) * 100) });
						}
						break;
					case "Finished":
						set({ progress: 100 });
						break;
				}
			});

			set({ status: "ready" });
		} catch (err) {
			console.error("Download failed:", err);
			set({
				error: err instanceof Error ? err.message : "Failed to download update",
				status: "error",
			});
		}
	},

	restartApp: async () => {
		await relaunch();
	},

	dismiss: () => {
		set({ dismissed: true });
	},

	reset: () => {
		set({
			status: "idle",
			progress: 0,
			updateInfo: null,
			error: null,
			update: null,
			dismissed: false,
		});
	},
}));
