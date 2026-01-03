import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Database,
	MessageSquare,
	Shield,
	Zap,
	FileSpreadsheet,
	Download,
	ArrowRight,
	Sparkles,
	Table,
	Lock,
	Apple,
	Github,
	Heart,
	Code,
	Users,
	GitPullRequest,
} from "lucide-react";
import "./index.css";
import duckbakeLogo from "./duckbake.png";
import { ScreenshotCarousel } from "@/components/screenshot-carousel";
import { getScreenshots } from "@/lib/screenshots";

// Dynamically load all screenshots from src/screenshots/
const screenshots = getScreenshots();

function DuckLogo({ className }: { className?: string }) {
	return <img src={duckbakeLogo} alt="DuckBake Logo" className={className} />;
}

function NavBar() {
	return (
		<nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
			<div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
				<a href="#" className="flex items-center gap-3 font-bold text-xl">
					<DuckLogo className="w-12" />
					<span>DuckBake</span>
				</a>
				<div className="hidden md:flex items-center gap-8">
					<a
						href="#features"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						Features
					</a>
					<a
						href="#how-it-works"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						How it Works
					</a>
					<a
						href="#contribute"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						Contribute
					</a>
					<a
						href="https://github.com/wes/duckbake"
						className="text-muted-foreground hover:text-foreground transition-colors"
						target="_blank"
						rel="noopener noreferrer"
					>
						<Github className="w-5 h-5" />
					</a>
				</div>
				<Button asChild>
					<a
						href="https://github.com/wes/duckbake/releases/latest/download/DuckBake-macOS.dmg"
						data-umami-event="Download"
						data-umami-event-location="navbar"
					>
						<Apple className="w-4 h-4" />
						Download for Mac
					</a>
				</Button>
			</div>
		</nav>
	);
}

function Hero() {
	const heroRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!heroRef.current) return;

		// Animate hero content on load
		animate(heroRef.current.querySelectorAll(".hero-animate"), {
			translateY: [30, 0],
			opacity: [0, 1],
			duration: 800,
			delay: stagger(100, { start: 200 }),
			ease: "outCubic",
		});

		// Animate the screenshot
		animate(heroRef.current.querySelector(".hero-screenshot"), {
			translateY: [60, 0],
			opacity: [0, 1],
			duration: 1000,
			delay: 600,
			ease: "outCubic",
		});
	}, []);

	return (
		<section ref={heroRef} className="relative pt-32 pb-20 overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 -z-10" />
			<div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
			<div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl -z-10 animate-pulse" />

			<div className="max-w-6xl mx-auto px-6">
				<div className="text-center max-w-4xl mx-auto">
					<div className="hero-animate opacity-0 flex flex-wrap items-center justify-center gap-3 mb-8">
						<a
							href="https://github.com/wes/duckbake"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
						>
							<Github className="w-4 h-4" />
							Fully Open Source
						</a>
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium">
							<Database className="w-4 h-4" />
							Powered by DuckDB
						</div>
						<a
							href="https://github.com/wes/duckbake/blob/master/CONTRIBUTING.md"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors"
						>
							<Heart className="w-4 h-4" />
							Contributions Welcome
						</a>
					</div>

					<h1 className="hero-animate opacity-0 text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
						Your Data, Your Mac,
						<span className="text-primary"> Quack!</span>
					</h1>

					<p className="hero-animate opacity-0 text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
						Store, query, and analyze your data locally with DuckDB and AI
						conversation. No cloud required. Your data never leaves your device.
					</p>

					<div className="hero-animate opacity-0 flex flex-col sm:flex-row gap-4 justify-center mb-16">
						<Button size="lg" asChild>
							<a
								href="https://github.com/wes/duckbake/releases/latest/download/DuckBake-macOS.dmg"
								data-umami-event="Download"
								data-umami-event-location="hero"
							>
								<Apple className="w-4 h-4" />
								Download for Mac
							</a>
						</Button>
						<Button size="lg" variant="outline" asChild>
							<a href="#features">
								Learn More
								<ArrowRight className="w-4 h-4 ml-2" />
							</a>
						</Button>
					</div>

					<ScreenshotCarousel
						className="hero-screenshot opacity-0"
						screenshots={screenshots}
					/>
				</div>
			</div>
		</section>
	);
}

function Features() {
	const featuresRef = useRef<HTMLDivElement>(null);
	const hasAnimated = useRef(false);

	useEffect(() => {
		if (!featuresRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !hasAnimated.current) {
						hasAnimated.current = true;

						// Animate section header
						animate(featuresRef.current?.querySelectorAll(".features-header"), {
							translateY: [40, 0],
							opacity: [0, 1],
							duration: 800,
							ease: "outCubic",
						});

						// Animate cards with stagger
						animate(featuresRef.current?.querySelectorAll(".feature-card"), {
							translateY: [60, 0],
							opacity: [0, 1],
							scale: [0.9, 1],
							duration: 700,
							delay: stagger(100, { start: 300 }),
							ease: "outCubic",
						});
					}
				});
			},
			{ threshold: 0.1 },
		);

		observer.observe(featuresRef.current);
		return () => observer.disconnect();
	}, []);

	const features = [
		{
			icon: Database,
			title: "Powered by DuckDB",
			description:
				"Lightning-fast analytical queries on your local data. Handle millions of rows with ease using the industry's fastest embedded database.",
		},
		{
			icon: MessageSquare,
			title: "AI-Powered Queries",
			description:
				"Ask questions in plain English and get SQL queries generated instantly. Powered by Ollama for completely offline LLM support.",
		},
		{
			icon: Shield,
			title: "100% Private",
			description:
				"Your data never leaves your Mac. No cloud storage, no data collection, no privacy concerns. Complete control over your information.",
		},
		{
			icon: FileSpreadsheet,
			title: "Import Anything",
			description:
				"CSV, JSON, Parquet, Excel - import data from any format. Drag and drop files to instantly create queryable tables.",
		},
		{
			icon: Zap,
			title: "Blazing Fast",
			description:
				"Native macOS app built with Tauri for minimal footprint and maximum performance. Query gigabytes of data in milliseconds.",
		},
		{
			icon: Lock,
			title: "Secure by Design",
			description:
				"Sandboxed application with no network access to your data. Your files are encrypted at rest using macOS security.",
		},
		{
			icon: Code,
			title: "Fully Open Source",
			description:
				"Built in the open on GitHub. Read the code, suggest features, report bugs, or contribute improvements. Let's make this amazing together.",
		},
	];

	return (
		<section
			ref={featuresRef}
			id="features"
			className="py-24 bg-muted/30 relative overflow-hidden"
		>
			<div className="max-w-6xl mx-auto px-6">
				<div className="features-header opacity-0 text-center mb-16">
					<h2 className="text-4xl md:text-5xl font-bold mb-4">
						Everything you need for local data analysis
					</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Powerful features that respect your privacy and work entirely on
						your device
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					{features.map((feature, index) => (
						<Card
							key={index}
							className="feature-card opacity-0 border-border/50 bg-card/80 backdrop-blur hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
						>
							<CardHeader>
								<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
									<feature.icon className="w-6 h-6 text-primary" />
								</div>
								<CardTitle className="text-xl">{feature.title}</CardTitle>
							</CardHeader>
							<CardContent>
								<CardDescription className="text-base">
									{feature.description}
								</CardDescription>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}


function HowItWorks() {
	const sectionRef = useRef<HTMLDivElement>(null);
	const hasAnimated = useRef(false);

	useEffect(() => {
		if (!sectionRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !hasAnimated.current) {
						hasAnimated.current = true;

						// Animate header
						animate(sectionRef.current?.querySelectorAll(".hiw-header"), {
							translateY: [30, 0],
							opacity: [0, 1],
							duration: 700,
							ease: "outCubic",
						});

						// Animate steps sequentially with number pop
						animate(sectionRef.current?.querySelectorAll(".step-number"), {
							scale: [0, 1.2, 1],
							opacity: [0, 1],
							duration: 600,
							delay: stagger(200, { start: 400 }),
							ease: "outBack",
						});

						animate(sectionRef.current?.querySelectorAll(".step-content"), {
							translateX: [30, 0],
							opacity: [0, 1],
							duration: 600,
							delay: stagger(200, { start: 500 }),
							ease: "outCubic",
						});

						// Animate connector lines
						animate(sectionRef.current?.querySelectorAll(".step-connector"), {
							scaleX: [0, 1],
							opacity: [0, 1],
							duration: 400,
							delay: stagger(200, { start: 800 }),
							ease: "outCubic",
						});
					}
				});
			},
			{ threshold: 0.2 },
		);

		observer.observe(sectionRef.current);
		return () => observer.disconnect();
	}, []);

	const steps = [
		{
			number: "01",
			title: "Import Your Data",
			description:
				"Drag and drop CSV, JSON, Excel, or Parquet files. DuckBake automatically detects schemas and creates tables.",
		},
		{
			number: "02",
			title: "Ask Questions",
			description:
				"Type questions in plain English like 'What were my top selling products last month?' and get instant SQL.",
		},
		{
			number: "03",
			title: "Get Insights",
			description:
				"View results in beautiful tables, export to various formats, or dive deeper with follow-up questions.",
		},
	];

	return (
		<section ref={sectionRef} id="how-it-works" className="py-24">
			<div className="max-w-6xl mx-auto px-6">
				<div className="hiw-header opacity-0 text-center mb-16">
					<h2 className="text-4xl md:text-5xl font-bold mb-4">
						Simple as 1, 2, 3
					</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						Get from raw data to actionable insights in minutes, not hours
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-8">
					{steps.map((step, index) => (
						<div key={index} className="relative">
							<div className="step-number opacity-0 text-8xl font-bold text-primary/10 absolute -top-4 -left-2">
								{step.number}
							</div>
							<div className="step-content opacity-0 relative pt-12">
								<h3 className="text-2xl font-bold mb-3">{step.title}</h3>
								<p className="text-muted-foreground text-lg">
									{step.description}
								</p>
							</div>
							{index < steps.length - 1 && (
								<div className="step-connector opacity-0 hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border origin-left" />
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function Testimonial() {
	return (
		<section className="py-24 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
			<div className="max-w-4xl mx-auto px-6 text-center">
				<blockquote className="text-2xl md:text-3xl font-medium mb-8 leading-relaxed">
					"Finally, a data tool that doesn't require me to upload my sensitive
					business data to the cloud. DuckBake gives me the power of SQL and AI
					while keeping everything on my Mac."
				</blockquote>
				<div className="flex items-center justify-center gap-4">
					<div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
						JD
					</div>
					<div className="text-left">
						<div className="font-semibold">Jane Doe</div>
						<div className="text-muted-foreground">Data Analyst</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function Contribute() {
	const ways = [
		{
			icon: GitPullRequest,
			title: "Submit a PR",
			description:
				"Found a bug? Have an improvement? We'd love your contributions.",
		},
		{
			icon: MessageSquare,
			title: "Share Ideas",
			description: "Open an issue to suggest features or discuss improvements.",
		},
		{
			icon: Users,
			title: "Spread the Word",
			description:
				"Star the repo, share with friends, help grow the community.",
		},
	];

	return (
		<section
			id="contribute"
			className="py-24 bg-gradient-to-br from-green-500/5 via-transparent to-primary/5"
		>
			<div className="max-w-6xl mx-auto px-6">
				<div className="text-center mb-16">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium mb-6">
						<Heart className="w-4 h-4" />
						Open Source
					</div>
					<h2 className="text-4xl md:text-5xl font-bold mb-4">
						Help us make DuckBake amazing
					</h2>
					<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
						DuckBake is fully open source and built by the community. Whether
						you're a developer, designer, or just have great ideas — we'd love
						your help.
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-8 mb-12">
					{ways.map((way, index) => (
						<div key={index} className="text-center">
							<div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
								<way.icon className="w-8 h-8 text-green-600 dark:text-green-400" />
							</div>
							<h3 className="text-xl font-bold mb-2">{way.title}</h3>
							<p className="text-muted-foreground">{way.description}</p>
						</div>
					))}
				</div>

				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<Button size="lg" variant="outline" asChild>
						<a
							href="https://github.com/wes/duckbake"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Github className="w-4 h-4 mr-2" />
							View on GitHub
						</a>
					</Button>
					<Button size="lg" asChild className="bg-green-600 hover:bg-green-700">
						<a
							href="https://github.com/wes/duckbake/blob/master/CONTRIBUTING.md"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Heart className="w-4 h-4 mr-2" />
							Start Contributing
						</a>
					</Button>
				</div>
			</div>
		</section>
	);
}

function Download() {
	const sectionRef = useRef<HTMLDivElement>(null);
	const duckRef = useRef<HTMLImageElement>(null);
	const hasAnimated = useRef(false);

	useEffect(() => {
		if (!sectionRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !hasAnimated.current) {
						hasAnimated.current = true;

						// Duck bounce and wobble
						animate(duckRef.current, {
							translateY: [-50, 0],
							rotate: ["-15deg", "10deg", "-5deg", "0deg"],
							scale: [0.5, 1.1, 1],
							opacity: [0, 1],
							duration: 1000,
							ease: "outElastic(1, 0.5)",
						});

						// Start continuous wobble after initial animation
						setTimeout(() => {
							animate(duckRef.current, {
								rotate: ["-2deg", "2deg"],
								translateY: [-3, 3],
								duration: 2000,
								alternate: true,
								loop: true,
								ease: "inOutSine",
							});
						}, 1000);

						// Content fade in
						animate(sectionRef.current?.querySelectorAll(".download-content"), {
							translateY: [30, 0],
							opacity: [0, 1],
							duration: 700,
							delay: stagger(100, { start: 400 }),
							ease: "outCubic",
						});

						// Buttons with bounce
						animate(sectionRef.current?.querySelectorAll(".download-btn"), {
							scale: [0.8, 1.05, 1],
							opacity: [0, 1],
							duration: 600,
							delay: stagger(100, { start: 700 }),
							ease: "outBack",
						});
					}
				});
			},
			{ threshold: 0.2 },
		);

		observer.observe(sectionRef.current);
		return () => observer.disconnect();
	}, []);

	return (
		<section ref={sectionRef} id="download" className="py-24">
			<div className="max-w-4xl mx-auto px-6 text-center">
				<img
					ref={duckRef}
					src={duckbakeLogo}
					alt="DuckBake Logo"
					className="w-24 mx-auto mb-6 opacity-0"
				/>
				<h2 className="download-content opacity-0 text-4xl md:text-5xl font-bold mb-4">
					Ready to analyze your data?
				</h2>
				<p className="download-content opacity-0 text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
					Download DuckBake for free and harness the power of DuckDB with an AI
					assistant. No account required. Fully open source.
				</p>

				<div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
					<Button size="lg" asChild className="download-btn opacity-0">
						<a
							href="https://github.com/wes/duckbake/releases/latest/download/DuckBake-macOS.dmg"
							data-umami-event="Download"
							data-umami-event-location="download-section"
						>
							<Apple className="w-4 h-4 mr-2" />
							Download for macOS
						</a>
					</Button>
					<Button
						size="lg"
						variant="outline"
						asChild
						className="download-btn opacity-0"
					>
						<a
							href="https://github.com/wes/duckbake"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Github className="w-4 h-4 mr-2" />
							View Source
						</a>
					</Button>
				</div>

				<p className="download-content opacity-0 text-sm text-muted-foreground">
					Requires macOS 13.0 or later. Universal binary for Intel and Apple
					Silicon.
				</p>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="py-12 border-t border-border/50">
			<div className="max-w-6xl mx-auto px-6">
				<div className="flex flex-col md:flex-row items-center justify-between gap-6">
					<div className="flex items-center gap-3">
						<DuckLogo className="w-12" />
						<span className="font-bold text-lg">DuckBake</span>
					</div>
					<div className="flex items-center gap-8 text-sm text-muted-foreground">
						<a
							href="/privacy"
							className="hover:text-foreground transition-colors"
						>
							Privacy Policy
						</a>
						<a
							href="/terms"
							className="hover:text-foreground transition-colors"
						>
							Terms of Service
						</a>
						<a
							href="https://github.com/wes/duckbake"
							className="hover:text-foreground transition-colors"
							target="_blank"
							rel="noopener noreferrer"
						>
							GitHub
						</a>
						<a
							href="https://github.com/wes/duckbake/blob/master/CONTRIBUTING.md"
							className="hover:text-foreground transition-colors"
							target="_blank"
							rel="noopener noreferrer"
						>
							Contribute
						</a>
					</div>
					<div className="text-sm text-muted-foreground">Built with DuckDB</div>
				</div>
			</div>
		</footer>
	);
}

export function App() {
	return (
		<div className="min-h-screen">
			<NavBar />
			<main>
				<Hero />
				<Features />
				<HowItWorks />
				<Contribute />
				<Testimonial />
				<Download />
			</main>
			<Footer />
		</div>
	);
}

export default App;
