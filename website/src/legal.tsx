import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import "./index.css";
import duckbakeLogo from "./duckbake.png";

function DuckLogo({ className }: { className?: string }) {
	return <img src={duckbakeLogo} alt="DuckBake Logo" className={className} />;
}

function LegalNav() {
	return (
		<nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
			<div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
				<a href="/" className="flex items-center gap-3 font-bold text-xl">
					<DuckLogo className="w-12" />
					<span>DuckBake</span>
				</a>
				<Button variant="ghost" asChild>
					<a href="/">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Home
					</a>
				</Button>
			</div>
		</nav>
	);
}

function LegalFooter() {
	return (
		<footer className="py-12 border-t border-border/50">
			<div className="max-w-4xl mx-auto px-6">
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
						<a href="/terms" className="hover:text-foreground transition-colors">
							Terms of Service
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}

function TermsOfService() {
	return (
		<div className="min-h-screen">
			<LegalNav />
			<main className="pt-24 pb-16">
				<div className="max-w-4xl mx-auto px-6">
					<h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
					<p className="text-muted-foreground mb-8">
						Last updated: December 30, 2024
					</p>

					<div className="prose prose-invert max-w-none space-y-8">
						<section>
							<h2 className="text-2xl font-semibold mb-4">
								1. Acceptance of Terms
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								By downloading, installing, or using DuckBake ("the Software"),
								you agree to be bound by these Terms of Service. If you do not
								agree to these terms, do not use the Software.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">2. License Grant</h2>
							<p className="text-muted-foreground leading-relaxed">
								DuckBake is provided as free, open-source software. Subject to
								the terms of this agreement, we grant you a non-exclusive,
								non-transferable, revocable license to use the Software for
								personal or commercial purposes.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								3. Local Processing
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								DuckBake is designed to operate entirely on your local device.
								All data processing, storage, and analysis occurs locally on
								your Mac. The Software does not transmit your data to external
								servers unless you explicitly configure it to do so (e.g., by
								connecting to an external LLM API).
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">4. Your Data</h2>
							<p className="text-muted-foreground leading-relaxed mb-4">
								You retain all rights to your data. DuckBake does not claim any
								ownership over data you import, create, or analyze using the
								Software. You are solely responsible for:
							</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-2">
								<li>
									Ensuring you have the right to use and process the data you
									import
								</li>
								<li>Maintaining backups of your data</li>
								<li>
									Complying with applicable laws regarding data you process
								</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								5. AI Features and Third-Party Services
							</h2>
							<p className="text-muted-foreground leading-relaxed mb-4">
								DuckBake includes AI-powered features that can operate in two
								modes:
							</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-2">
								<li>
									<strong>Local Mode (Ollama):</strong> AI processing occurs
									entirely on your device using Ollama. No data is sent
									externally.
								</li>
								<li>
									<strong>API Mode:</strong> If you configure an external LLM
									API (e.g., OpenAI, Anthropic), your queries and relevant data
									context may be sent to those services. You are responsible for
									reviewing and agreeing to the terms of service of any
									third-party AI providers you use.
								</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								6. Disclaimer of Warranties
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND,
								EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
								OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
								NONINFRINGEMENT. WE DO NOT WARRANT THAT THE SOFTWARE WILL BE
								ERROR-FREE OR UNINTERRUPTED.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								7. Limitation of Liability
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR
								ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF
								CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN
								CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
								SOFTWARE.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								8. Acceptable Use
							</h2>
							<p className="text-muted-foreground leading-relaxed mb-4">
								You agree not to use DuckBake to:
							</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-2">
								<li>
									Process data that you do not have the legal right to use
								</li>
								<li>Violate any applicable laws or regulations</li>
								<li>
									Infringe upon the intellectual property rights of others
								</li>
								<li>Engage in any activity that could harm others</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								9. Changes to Terms
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								We reserve the right to modify these terms at any time. Changes
								will be posted on this page with an updated revision date.
								Continued use of the Software after changes constitutes
								acceptance of the new terms.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
							<p className="text-muted-foreground leading-relaxed">
								You may stop using DuckBake at any time by uninstalling the
								Software. We reserve the right to terminate or suspend access to
								the Software for violations of these terms.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								11. Contact Information
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								For questions about these Terms of Service, please open an issue
								on our GitHub repository or contact us through the channels
								listed on our website.
							</p>
						</section>
					</div>
				</div>
			</main>
			<LegalFooter />
		</div>
	);
}

function PrivacyPolicy() {
	return (
		<div className="min-h-screen">
			<LegalNav />
			<main className="pt-24 pb-16">
				<div className="max-w-4xl mx-auto px-6">
					<h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
					<p className="text-muted-foreground mb-8">
						Last updated: December 30, 2024
					</p>

					<div className="prose prose-invert max-w-none space-y-8">
						<section className="bg-primary/5 border border-primary/20 rounded-lg p-6">
							<h2 className="text-xl font-semibold mb-3 text-primary">
								Privacy First
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								DuckBake is designed with privacy as a core principle. Your data
								stays on your device. We do not collect, store, or have access
								to your personal data or the data you analyze using DuckBake.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								1. Information We Don't Collect
							</h2>
							<p className="text-muted-foreground leading-relaxed mb-4">
								Unlike most applications, DuckBake is built to minimize data
								collection. We do NOT collect:
							</p>
							<ul className="list-disc list-inside text-muted-foreground space-y-2">
								<li>Your personal information</li>
								<li>The data files you import or analyze</li>
								<li>Your SQL queries or analysis results</li>
								<li>Your conversations with the AI assistant</li>
								<li>Usage analytics or telemetry</li>
								<li>Device information or identifiers</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								2. Local Data Storage
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								All data you import into DuckBake is stored locally on your Mac
								using DuckDB. This data never leaves your device unless you
								explicitly export it. Your database files are stored in your
								user directory and are protected by macOS security features.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								3. AI Processing
							</h2>
							<div className="space-y-4">
								<div className="bg-muted/30 rounded-lg p-4">
									<h3 className="font-semibold mb-2">
										Local AI (Ollama) - Default
									</h3>
									<p className="text-muted-foreground leading-relaxed">
										When using Ollama for AI features, all processing happens
										locally on your device. Your queries and data context never
										leave your Mac.
									</p>
								</div>
								<div className="bg-muted/30 rounded-lg p-4">
									<h3 className="font-semibold mb-2">
										External AI APIs - Optional
									</h3>
									<p className="text-muted-foreground leading-relaxed">
										If you choose to configure an external AI provider (such as
										OpenAI or Anthropic), your natural language queries and
										relevant schema information may be sent to those services to
										generate SQL queries. Please review the privacy policies of
										any third-party AI services you choose to use.
									</p>
								</div>
							</div>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								4. Website Analytics
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								This website (duckbake.com) does not use cookies or tracking
								scripts. We do not collect analytics data about your visits to
								this website.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								5. Download Distribution
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								DuckBake is distributed through GitHub releases. When you
								download the application, GitHub may collect standard server
								logs. Please refer to GitHub's privacy policy for more
								information about their data practices.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								6. Automatic Updates
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								DuckBake may check for updates by contacting GitHub to compare
								version numbers. This check only transmits the current version
								number and does not include any personal data or information
								about your usage.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								7. Children's Privacy
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								DuckBake is not directed at children under 13. Since we do not
								collect any personal information, we do not knowingly collect
								data from children.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">
								8. Changes to This Policy
							</h2>
							<p className="text-muted-foreground leading-relaxed">
								We may update this Privacy Policy from time to time. Any changes
								will be posted on this page with an updated revision date.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">9. Your Rights</h2>
							<p className="text-muted-foreground leading-relaxed">
								Since DuckBake stores all data locally on your device and we do
								not collect any personal information, you have complete control
								over your data. You can delete your data at any time by removing
								your DuckBake database files or uninstalling the application.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
							<p className="text-muted-foreground leading-relaxed">
								If you have questions about this Privacy Policy, please open an
								issue on our GitHub repository or contact us through the
								channels listed on our website.
							</p>
						</section>
					</div>
				</div>
			</main>
			<LegalFooter />
		</div>
	);
}

function LegalPage() {
	const path = window.location.pathname;

	if (path === "/terms") {
		return <TermsOfService />;
	}

	if (path === "/privacy") {
		return <PrivacyPolicy />;
	}

	// Fallback redirect to home
	window.location.href = "/";
	return null;
}

const elem = document.getElementById("root")!;
const app = (
	<StrictMode>
		<LegalPage />
	</StrictMode>
);

if (import.meta.hot) {
	const root = (import.meta.hot.data.root ??= createRoot(elem));
	root.render(app);
} else {
	createRoot(elem).render(app);
}
