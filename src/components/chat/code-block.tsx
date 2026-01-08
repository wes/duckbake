import { useEffect, useState } from "react";
import { codeToHtml, type BundledTheme } from "shiki";
import { useThemeStore, type ThemeStyle } from "@/stores/theme-store";

interface CodeBlockProps {
	code: string;
	language?: string;
}

// Map app themes to Shiki themes
function getShikiTheme(
	style: ThemeStyle,
	isDark: boolean,
): BundledTheme | null {
	switch (style) {
		case "glass":
			return isDark ? "plastic" : "rose-pine-dawn";
		case "mono":
			return null; // No syntax highlighting for mono theme
		case "kodama":
			return isDark ? "gruvbox-dark-hard" : "gruvbox-light-hard";
		case "catppuccin":
			return isDark ? "catppuccin-mocha" : "catppuccin-latte";
		default:
			return isDark ? "aurora-x" : "rose-pine-dawn";
	}
}

export function CodeBlock({ code, language = "text" }: CodeBlockProps) {
	const [html, setHtml] = useState<string>("");
	const { mode, style } = useThemeStore();

	const isDark =
		mode === "dark" ||
		(mode === "system" &&
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-color-scheme: dark)").matches);

	const shikiTheme = getShikiTheme(style, isDark);

	useEffect(() => {
		let cancelled = false;

		async function highlight() {
			// For mono theme, skip syntax highlighting
			if (!shikiTheme) {
				setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
				return;
			}

			try {
				const highlighted = await codeToHtml(code, {
					lang: language,
					theme: shikiTheme,
				});
				if (!cancelled) {
					setHtml(highlighted);
				}
			} catch {
				// Fallback for unsupported languages
				try {
					const highlighted = await codeToHtml(code, {
						lang: "text",
						theme: shikiTheme,
					});
					if (!cancelled) {
						setHtml(highlighted);
					}
				} catch {
					// Last resort fallback
					if (!cancelled) {
						setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`);
					}
				}
			}
		}

		highlight();

		return () => {
			cancelled = true;
		};
	}, [code, language, shikiTheme]);

	if (!html) {
		// Show plain code while loading
		return (
			<pre className="bg-muted/50 border rounded-md p-4 overflow-x-auto text-[16px] font-mono leading-relaxed">
				<code>{code}</code>
			</pre>
		);
	}

	// For mono theme, use simple styling
	if (!shikiTheme) {
		return (
			<div
				className="bg-background my-5 [&_pre]:p-5 [&_pre]:overflow-x-auto [&_pre]:text-[15px] [&_pre]:leading-relaxed [&_pre]:m-0 [&_pre]:bg-transparent [&_code]:text-foreground"
				style={{
					borderRadius: "6px",
					border: isDark
						? "2px solid rgba(255,255,255,0.15)"
						: "2px solid rgba(0,0,0,0.15)",
				}}
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		);
	}

	return (
		<div
			className="my-5 overflow-hidden border [&>pre]:p-4 [&>pre]:overflow-x-auto [&>pre]:text-[16px] [&>pre]:leading-relaxed [&>pre]:m-0"
			style={{
				borderRadius: "8px",
			}}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
