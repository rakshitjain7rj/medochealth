/**
 * OPD Token Allocation Engine - API Server
 * Entry point for the Express application
 */

import express from "express";
import tokenRoutes from "./api/token.routes";
import doctorRoutes from "./api/doctor.routes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Register routes
app.use("/tokens", tokenRoutes);
app.use("/doctors", doctorRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🏥 OPD Token Allocation Engine running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Doctors: http://localhost:${PORT}/doctors`);
  console.log(`   Tokens: http://localhost:${PORT}/tokens`);
});
