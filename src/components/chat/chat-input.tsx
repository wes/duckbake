import { useState, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
}

export function ChatInput({
	onSend,
	disabled,
}: ChatInputProps) {
	const [input, setInput] = useState("");

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const trimmed = input.trim();
			if (trimmed && !disabled) {
				onSend(trimmed);
				setInput("");
			}
		},
		[input, onSend, disabled],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit(e);
			}
		},
		[handleSubmit],
	);

	return (
		<div className="border-t p-4 flex-none bg-background">
			<form onSubmit={handleSubmit} className="space-y-3">
				<div className="relative">
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Ask about your data..."
						disabled={disabled}
						rows={3}
						className="w-full resize-none rounded-lg bg-background px-4 py-3 pr-14 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					/>
					<Button
						type="submit"
						size="icon"
						disabled={disabled || !input.trim()}
						className="absolute bottom-1 right-3 rounded-full h-11 w-11 shadow-md"
					>
						<Send className="w-6 h-6" />
					</Button>
				</div>
			</form>
		</div>
	);
}
