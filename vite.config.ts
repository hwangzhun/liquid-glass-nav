import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import {
  clearSessionCookie,
  createSessionToken,
  hasValidSession,
  sessionCookie,
  timingSafeEqual,
} from "./shared/auth";
import { analyzeSite } from "./shared/siteAnalysis";

function vitePluginSiteAnalysis(): Plugin {
  return {
    name: "site-analysis-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/analyze-site", (req, res, next) => {
        if (req.method !== "POST") return next();
        let body = "";
        req.on("data", (chunk) => { body += chunk.toString(); });
        req.on("end", async () => {
          try {
            const password = process.env.NAV_PASSWORD?.trim() || "tidal";
            if (!await hasValidSession(req.headers.cookie, password)) {
              res.writeHead(401, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
              res.end(JSON.stringify({ error: "请先登录。" }));
              return;
            }
            const result = await analyzeSite(body ? JSON.parse(body) : {});
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify(result));
          } catch (error) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : "网站分析失败。" }));
          }
        });
      });
    },
  };
}

function vitePluginPersonalAuth(): Plugin {
  return {
    name: "personal-auth-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/auth", async (req, res, next) => {
        const password = process.env.NAV_PASSWORD?.trim() || "tidal";
        const jsonHeaders = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

        if (req.method === "GET") {
          const authenticated = await hasValidSession(req.headers.cookie, password);
          res.writeHead(authenticated ? 200 : 401, jsonHeaders);
          res.end(JSON.stringify({ authenticated, configured: true, development: true }));
          return;
        }

        if (req.method === "DELETE") {
          res.writeHead(200, { ...jsonHeaders, "Set-Cookie": clearSessionCookie(false) });
          res.end(JSON.stringify({ authenticated: false }));
          return;
        }

        if (req.method !== "POST") return next();
        let body = "";
        req.on("data", (chunk) => { body += chunk.toString(); });
        req.on("end", async () => {
          try {
            const input = body ? JSON.parse(body) as { password?: unknown } : {};
            const submitted = typeof input.password === "string" ? input.password : "";
            if (!timingSafeEqual(submitted, password)) {
              res.writeHead(401, jsonHeaders);
              res.end(JSON.stringify({ error: "密码不正确。", configured: true }));
              return;
            }
            const token = await createSessionToken(password);
            res.writeHead(200, { ...jsonHeaders, "Set-Cookie": sessionCookie(token, false) });
            res.end(JSON.stringify({ authenticated: true, configured: true, development: true }));
          } catch {
            res.writeHead(400, jsonHeaders);
            res.end(JSON.stringify({ error: "登录请求格式不正确。" }));
          }
        });
      });
    },
  };
}

const plugins = [react(), tailwindcss(), vitePluginPersonalAuth(), vitePluginSiteAnalysis()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
