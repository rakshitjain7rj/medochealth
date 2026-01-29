/**
 * OPD Token Allocation Engine - API Server
 */

import express from "express";
import tokenRoutes from "./api/token.routes";
import doctorRoutes from "./api/doctor.routes";

const app = express();
const PORT = 3000;

app.use(express.json());

app.use("/tokens", tokenRoutes);
app.use("/doctors", doctorRoutes);

app.listen(PORT, () => {
  console.log(`OPD Token Allocation Engine running on port ${PORT}`);
});
