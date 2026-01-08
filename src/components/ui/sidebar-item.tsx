import { forwardRef, ReactNode } from "react";

interface SidebarItemProps {
	icon: ReactNode;
	name: string;
	statusElement?: ReactNode;
	hoverElement?: ReactNode;
	selected?: boolean;
	onClick?: () => void;
	className?: string;
}

export const SidebarItem = forwardRef<HTMLDivElement, SidebarItemProps>(
	function SidebarItem(
		{ icon, name, statusElement, hoverElement, selected, onClick, className },
		ref,
	) {
		return (
			<div
				ref={ref}
				className={`group w-full flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition-colors overflow-hidden ${
					selected
						? "bg-muted text-foreground"
						: "text-muted-foreground hover:text-foreground hover:bg-muted/50"
				} ${className || ""}`}
				onClick={onClick}
			>
				<span className="flex-none">{icon}</span>
				<span className="flex-1 w-0 truncate font-semibold">{name}</span>
				{hoverElement && (
					<span className="flex-none opacity-0 group-hover:opacity-100 transition-opacity">
						{hoverElement}
					</span>
				)}
				{statusElement && !hoverElement && (
					<span className="flex-none">{statusElement}</span>
				)}
				{statusElement && hoverElement && (
					<span className="flex-none group-hover:hidden">{statusElement}</span>
				)}
			</div>
		);
	},
);
