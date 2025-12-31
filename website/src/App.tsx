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
					<a href="https://github.com/wes/duckbake/releases/latest/download/DuckBake-macOS.dmg">
						<Apple className="w-4 h-4" />
						Download for Mac
					</a>
				</Button>
			</div>
		</nav>
	);
}

function Hero() {
	return (
		<section className="relative pt-32 pb-20 overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 -z-10" />
			<div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
			<div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl -z-10 animate-pulse" />

			<div className="max-w-6xl mx-auto px-6">
				<div className="text-center max-w-4xl mx-auto">
					<div className="flex flex-wrap items-center justify-center gap-3 mb-8">
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

					<h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
						Your Data, Your Mac,
						<span className="text-primary"> Quack!</span>
					</h1>

					<p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
						Store, query, and analyze your data locally with DuckDB and AI
						conversation. No cloud required. Your data never leaves your device.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
						<Button size="lg" asChild>
							<a href="https://github.com/wes/duckbake/releases/latest/download/DuckBake-macOS.dmg">
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

					<div className="relative rounded-2xl border border-border/50 shadow-2xl shadow-primary/10 overflow-hidden bg-card">
						<div className="absolute top-0 left-0 right-0 h-10 bg-muted/50 flex items-center gap-2 px-4 border-b border-border/50">
							<div className="w-3 h-3 rounded-full bg-red-400" />
							<div className="w-3 h-3 rounded-full bg-yellow-400" />
							<div className="w-3 h-3 rounded-full bg-green-400" />
							<span className="ml-4 text-sm text-muted-foreground">
								DuckBake
							</span>
						</div>
						<div className="pt-10 p-6">
							<div className="grid md:grid-cols-2 gap-4">
								<div className="bg-muted/30 rounded-lg p-4 text-left">
									<div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
										<MessageSquare className="w-4 h-4 text-primary" />
										AI Assistant
									</div>
									<div className="space-y-3">
										<div className="bg-background rounded-lg p-3 text-sm">
											Show me the top 10 customers by revenue this quarter
										</div>
										<div className="bg-primary/10 rounded-lg p-3 text-sm text-primary">
											<code className="text-xs">
												SELECT customer_name, SUM(amount) as revenue
												<br />
												FROM orders WHERE quarter = 'Q4'
												<br />
												GROUP BY customer_name
												<br />
												ORDER BY revenue DESC LIMIT 10;
											</code>
										</div>
									</div>
								</div>
								<div className="bg-muted/30 rounded-lg p-4 text-left">
									<div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
										<Table className="w-4 h-4 text-primary" />
										Results
									</div>
									<div className="bg-background rounded-lg overflow-hidden text-sm">
										<table className="w-full">
											<thead className="bg-muted/50">
												<tr>
													<th className="px-3 py-2 text-left font-medium">
														Customer
													</th>
													<th className="px-3 py-2 text-right font-medium">
														Revenue
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-border">
												<tr>
													<td className="px-3 py-2">Acme Corp</td>
													<td className="px-3 py-2 text-right text-primary font-medium">
														$284,500
													</td>
												</tr>
												<tr>
													<td className="px-3 py-2">TechStart Inc</td>
													<td className="px-3 py-2 text-right text-primary font-medium">
														$198,200
													</td>
												</tr>
												<tr>
													<td className="px-3 py-2">Global Trade</td>
													<td className="px-3 py-2 text-right text-primary font-medium">
														$156,800
													</td>
												</tr>
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function Features() {
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
		<section id="features" className="py-24 bg-muted/30">
			<div className="max-w-6xl mx-auto px-6">
				<div className="text-center mb-16">
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
							className="border-border/50 bg-card/50 backdrop-blur hover:shadow-lg transition-shadow"
						>
							<CardHeader>
								<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
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
		<section id="how-it-works" className="py-24">
			<div className="max-w-6xl mx-auto px-6">
				<div className="text-center mb-16">
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
							<div className="text-8xl font-bold text-primary/10 absolute -top-4 -left-2">
								{step.number}
							</div>
							<div className="relative pt-12">
								<h3 className="text-2xl font-bold mb-3">{step.title}</h3>
								<p className="text-muted-foreground text-lg">
									{step.description}
								</p>
							</div>
							{index < steps.length - 1 && (
								<div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border" />
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
			description: "Found a bug? Have an improvement? We'd love your contributions.",
		},
		{
			icon: MessageSquare,
			title: "Share Ideas",
			description: "Open an issue to suggest features or discuss improvements.",
		},
		{
			icon: Users,
			title: "Spread the Word",
			description: "Star the repo, share with friends, help grow the community.",
		},
	];

	return (
		<section id="contribute" className="py-24 bg-gradient-to-br from-green-500/5 via-transparent to-primary/5">
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
						DuckBake is fully open source and built by the community. Whether you're a developer, designer, or just have great ideas — we'd love your help.
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
	return (
		<section id="download" className="py-24">
			<div className="max-w-4xl mx-auto px-6 text-center">
				<DuckLogo className="w-24 mx-auto" />
				<h2 className="text-4xl md:text-5xl font-bold mb-4">
					Ready to analyze your data?
				</h2>
				<p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
					Download DuckBake for free and harness the power of DuckDB with an AI
					assistant. No account required. Fully open source.
				</p>

				<div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
					<Button size="lg" asChild>
						<a href="https://github.com/wes/duckbake/releases/latest/download/DuckBake-macOS.dmg">
							<Apple className="w-4 h-4 mr-2" />
							Download for macOS
						</a>
					</Button>
					<Button size="lg" variant="outline" asChild>
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

				<p className="text-sm text-muted-foreground">
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
						<a href="/privacy" className="hover:text-foreground transition-colors">
							Privacy Policy
						</a>
						<a href="/terms" className="hover:text-foreground transition-colors">
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
