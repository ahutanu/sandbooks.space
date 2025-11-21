import { Router } from 'express';
import {
  recreateSandbox,
  getHealth,
  getSandboxStatus,
  destroySandbox
} from '../controllers/sandbox.controller';

const router = Router();

// Sandbox lifecycle endpoints
router.post('/recreate', recreateSandbox);
router.post('/destroy', destroySandbox);

// Sandbox health and status endpoints
router.get('/health', getHealth);
router.get('/status', getSandboxStatus);

export default router;
