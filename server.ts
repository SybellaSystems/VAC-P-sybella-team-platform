import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: "multibillion-booster-core" });
  });

  app.get("/api/workspace/modules", (req, res) => {
    res.json([
      { key: 'analytics_dashboard', name: 'Strategic Analytics', status: 'ACTIVE' },
      { key: 'user_management', name: 'Identity Engine', status: 'ACTIVE' },
      { key: 'finance_reports', name: 'Fiscal Ledger', status: 'MAINTENANCE' },
      { key: 'task_tracking', name: 'Ops Orchestrator', status: 'ACTIVE' }
    ]);
  });

  app.post("/api/workspace/logs", (req, res) => {
    const { action, userId, metadata } = req.body;
    console.log(`[WORKSPACE_LOG] User: ${userId} Action: ${action}`, metadata);
    res.json({ status: "logged", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
