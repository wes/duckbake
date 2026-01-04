import { serve } from "bun";
import index from "./index.html";
import terms from "./terms.html";
import privacy from "./privacy.html";
import notFoundPage from "./404.html";

const server = serve({
  routes: {
    "/": index,
    "/terms": terms,
    "/privacy": privacy,

    // SEO files
    "/robots.txt": async () => {
      const file = Bun.file(import.meta.dir + "/robots.txt");
      return new Response(file, {
        headers: { "Content-Type": "text/plain" },
      });
    },
    "/sitemap.xml": async () => {
      const file = Bun.file(import.meta.dir + "/sitemap.xml");
      return new Response(file, {
        headers: { "Content-Type": "application/xml" },
      });
    },
    "/og-image.png": async () => {
      const file = Bun.file(import.meta.dir + "/og-image.png");
      return new Response(file, {
        headers: { "Content-Type": "image/png" },
      });
    },
    "/og-image-v2.png": async () => {
      const file = Bun.file(import.meta.dir + "/og-image-v2.png");
      return new Response(file, {
        headers: { "Content-Type": "image/png" },
      });
    },

    // 404 handler for unmatched routes - serve branded 404 page
    "/*": notFoundPage,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
