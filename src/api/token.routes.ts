/**
 * Token Routes
 * API endpoints for token operations
 */

import { Router } from "express";
import {
  createTokenHandler,
  cancelTokenHandler,
  markNoShowHandler,
} from "../controllers/tokenController";

const router = Router();

// POST /tokens - Create and allocate a new token
router.post("/", createTokenHandler);

// POST /tokens/:tokenId/cancel - Cancel a token
router.post("/:tokenId/cancel", cancelTokenHandler);

// POST /tokens/:tokenId/no-show - Mark token as no-show
router.post("/:tokenId/no-show", markNoShowHandler);

export default router;
