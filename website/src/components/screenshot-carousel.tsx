import { useState, useEffect, useRef, useCallback } from "react";

interface Screenshot {
	src: string;
	title: string;
	description: string;
}

interface ScreenshotCarouselProps {
	screenshots: Screenshot[];
	className?: string;
	interval?: number;
}

export function ScreenshotCarousel({
	screenshots,
	className,
	interval = 5000
}: ScreenshotCarouselProps) {
	const [activeIndex, setActiveIndex] = useState(0);
	const [isTransitioning, setIsTransitioning] = useState(false);
	const [isPaused, setIsPaused] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const goToSlide = useCallback((index: number) => {
		if (index === activeIndex || isTransitioning) return;

		setIsTransitioning(true);

		// Short delay for fade out, then change slide
		setTimeout(() => {
			setActiveIndex(index);
			setIsTransitioning(false);
		}, 150);
	}, [activeIndex, isTransitioning]);

	const nextSlide = useCallback(() => {
		if (isTransitioning) return;
		goToSlide((activeIndex + 1) % screenshots.length);
	}, [activeIndex, screenshots.length, isTransitioning, goToSlide]);

	// Auto-advance timer
	useEffect(() => {
		if (isPaused || isTransitioning) return;

		clearTimer();
		timerRef.current = setTimeout(nextSlide, interval);

		return clearTimer;
	}, [activeIndex, isPaused, isTransitioning, interval, nextSlide, clearTimer]);

	// Cleanup on unmount
	useEffect(() => {
		return clearTimer;
	}, [clearTimer]);

	if (screenshots.length === 0) return null;

	return (
		<div
			className={className}
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
		>
			{/* Image container */}
			<div className="relative rounded-2xl border border-border/50 shadow-2xl shadow-primary/10 overflow-hidden bg-card">
				<img
					src={screenshots[activeIndex].src}
					alt={screenshots[activeIndex].title}
					className={`w-full h-auto transition-opacity duration-150 ${
						isTransitioning ? "opacity-0" : "opacity-100"
					}`}
				/>

				{/* Overlay with title */}
				<div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 transition-opacity duration-150 ${
					isTransitioning ? "opacity-0" : "opacity-100"
				}`}>
					<h3 className="text-white font-semibold text-lg">
						{screenshots[activeIndex].title}
					</h3>
					<p className="text-white/70 text-sm">
						{screenshots[activeIndex].description}
					</p>
				</div>
			</div>

			{/* Navigation dots */}
			<div className="flex justify-center gap-2 mt-4">
				{screenshots.map((_, index) => (
					<button
						key={index}
						onClick={() => goToSlide(index)}
						className={`h-2.5 rounded-full transition-all duration-300 ${
							index === activeIndex
								? "bg-primary w-8"
								: "bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2.5"
						}`}
						aria-label={`Go to slide ${index + 1}`}
					/>
				))}
			</div>
		</div>
	);
}

export default ScreenshotCarousel;
