import { useState, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { OllamaModel } from "@/types";

interface ChatInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
	models: OllamaModel[];
	selectedModel: string;
	onModelChange: (model: string) => void;
}

export function ChatInput({
	onSend,
	disabled,
	models,
	selectedModel,
	onModelChange,
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
						className="w-full resize-none rounded-lg bg-background px-4 py-3 pr-14 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					/>
					<Button
						type="submit"
						size="icon"
						disabled={disabled || !input.trim()}
						className="absolute bottom-1 right-3 rounded-full h-11 w-11 shadow-md"
					>
						<Send className="w-6 h-6" />
					</Button>

					<div className="absolute bottom-0 right-20 z-1">
						<Select value={selectedModel} onValueChange={onModelChange}>
							<SelectTrigger className="w-48 h-6 text-xs">
								<SelectValue placeholder="Select model" />
							</SelectTrigger>
							<SelectContent>
								{models.map((model) => (
									<SelectItem
										key={model.name}
										value={model.name}
										className="text-xs"
									>
										{model.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</form>
		</div>
	);
}
