import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import "./index.css";
import duckbakeLogo from "./duckbake.png";

function NotFoundPage() {
	const containerRef = useRef<HTMLDivElement>(null);
	const duckRef = useRef<HTMLImageElement>(null);

	useEffect(() => {
		if (!containerRef.current || !duckRef.current) return;

		// Duck confused wobble animation
		animate(duckRef.current, {
			rotate: ["-10deg", "10deg", "-5deg", "5deg", "0deg"],
			scale: [0.8, 1.1, 1],
			opacity: [0, 1],
			duration: 1000,
			ease: "outElastic(1, 0.5)",
		});

		// Start continuous confused wobble
		setTimeout(() => {
			animate(duckRef.current, {
				rotate: ["-3deg", "3deg"],
				duration: 1500,
				alternate: true,
				loop: true,
				ease: "inOutSine",
			});
		}, 1000);

		// Content fade in
		animate(containerRef.current.querySelectorAll(".fade-in"), {
			translateY: [20, 0],
			opacity: [0, 1],
			duration: 600,
			delay: (_, i) => 200 + i * 100,
			ease: "outCubic",
		});
	}, []);

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 -z-10" />
			<div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />
			<div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl -z-10" />

			<div ref={containerRef} className="text-center px-6 max-w-lg">
				<img
					ref={duckRef}
					src={duckbakeLogo}
					alt="DuckBake Logo"
					className="w-32 mx-auto mb-8 opacity-0"
				/>

				<h1 className="fade-in opacity-0 text-8xl font-bold text-primary mb-4">
					404
				</h1>

				<h2 className="fade-in opacity-0 text-2xl md:text-3xl font-bold mb-4">
					Quack! Page not found
				</h2>

				<p className="fade-in opacity-0 text-lg text-muted-foreground mb-8">
					This duck couldn't find the page you're looking for. It might have
					waddled away or never existed in the first place.
				</p>

				<div className="fade-in opacity-0 flex flex-col sm:flex-row gap-4 justify-center">
					<Button size="lg" asChild>
						<a href="/">
							<Home className="w-4 h-4 mr-2" />
							Back to Home
						</a>
					</Button>
					<Button size="lg" variant="outline" onClick={() => history.back()}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Go Back
					</Button>
				</div>
			</div>
		</div>
	);
}

export default NotFoundPage;

// Mount the component
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const elem = document.getElementById("root")!;
const app = (
	<StrictMode>
		<NotFoundPage />
	</StrictMode>
);

if (import.meta.hot) {
	const root = (import.meta.hot.data.root ??= createRoot(elem));
	root.render(app);
} else {
	createRoot(elem).render(app);
}
