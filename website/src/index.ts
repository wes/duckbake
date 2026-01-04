import { serve } from "bun";
import path from "path";
import index from "./index.html";
import terms from "./terms.html";
import privacy from "./privacy.html";
import notFoundPage from "./404.html";

const publicDir = path.join(import.meta.dir, "../public");

// MIME types for static files
const mimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
};

// Helper to serve static files from public folder
async function serveStatic(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const filePath = path.join(publicDir, url.pathname);
  const file = Bun.file(filePath);

  if (await file.exists()) {
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || "application/octet-stream";
    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  }
  return null;
}

const server = serve({
  routes: {
    "/": index,
    "/terms": terms,
    "/privacy": privacy,

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

    // 404 page route
    "/404": notFoundPage,
  },

  // Handle unmatched routes: try static file first, then redirect to 404
  async fetch(req) {
    const staticResponse = await serveStatic(req);
    if (staticResponse) return staticResponse;

    // Rewrite to 404 page (internal rewrite, not redirect)
    const url = new URL(req.url);
    url.pathname = "/404";
    const notFoundReq = new Request(url.toString(), req);
    return fetch(notFoundReq);
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
