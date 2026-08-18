import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  clearSessionCookie,
  createSessionToken,
  hasValidSession,
  sessionCookie,
  timingSafeEqual,
} from "../shared/auth.js";
import { analyzeSite } from "../shared/siteAnalysis.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const navPassword = process.env.NAV_PASSWORD?.trim();

  app.use(express.json({ limit: "16kb" }));

  const requestIsSecure = (req: express.Request) => req.secure || req.headers["x-forwarded-proto"] === "https";

  app.get("/api/auth", async (req, res) => {
    if (!navPassword) {
      res.status(503).json({ authenticated: false, configured: false });
      return;
    }
    const authenticated = await hasValidSession(req.headers.cookie, navPassword);
    res.status(authenticated ? 200 : 401).json({ authenticated, configured: true });
  });

  app.post("/api/auth", async (req, res) => {
    if (!navPassword) {
      res.status(503).json({ error: "NAV_PASSWORD 尚未配置。", configured: false });
      return;
    }
    const submitted = typeof req.body?.password === "string" ? req.body.password : "";
    if (!timingSafeEqual(submitted, navPassword)) {
      res.status(401).json({ error: "密码不正确。", configured: true });
      return;
    }
    const token = await createSessionToken(navPassword);
    res.setHeader("Set-Cookie", sessionCookie(token, requestIsSecure(req)));
    res.json({ authenticated: true, configured: true });
  });

  app.delete("/api/auth", (req, res) => {
    res.setHeader("Set-Cookie", clearSessionCookie(requestIsSecure(req)));
    res.json({ authenticated: false });
  });

  app.post("/api/analyze-site", async (req, res) => {
    try {
      if (!navPassword || !await hasValidSession(req.headers.cookie, navPassword)) {
        res.status(401).json({ error: "请先登录。" });
        return;
      }
      res.json(await analyzeSite(req.body ?? {}));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "网站分析失败。" });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
