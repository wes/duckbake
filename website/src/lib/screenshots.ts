// Import screenshots directly
import projectChat from "../../public/screenshots/project-chat.png";
import home from "../../public/screenshots/home.png";
import projectBrowser from "../../public/screenshots/project-browser.png";
import projectQuery from "../../public/screenshots/project-query.png";
import screenshotTheme from "../../public/screenshots/screenshot-theme.png";

export interface Screenshot {
	src: string;
	title: string;
	description: string;
	filename: string;
}

// Screenshots with metadata - order matters here
export const screenshots: Screenshot[] = [
	{
		src: projectChat,
		title: "Project Chat",
		description: "Ask questions in plain English and get instant SQL queries",
		filename: "project-chat",
	},
	{
		src: home,
		title: "Home",
		description: "Manage all your data projects in one place",
		filename: "home",
	},
	{
		src: projectBrowser,
		title: "Project Browser",
		description: "Explore and filter your data with an intuitive interface",
		filename: "project-browser",
	},
	{
		src: projectQuery,
		title: "Project Query",
		description: "Write and execute powerful SQL queries with syntax highlighting",
		filename: "project-query",
	},
	{
		src: screenshotTheme,
		title: "Theme Support",
		description: "Beautiful dark and light theme support",
		filename: "screenshot-theme",
	},
];

export function getScreenshots(): Screenshot[] {
	return screenshots;
}
