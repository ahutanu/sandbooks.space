import { Router } from 'express';
import { executeCode, healthCheck } from '../controllers/execute.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { ExecuteRequestSchema } from '../types/execute.types';

const router = Router();

router.post('/execute', validateRequest(ExecuteRequestSchema), executeCode);
router.get('/health', healthCheck);

export default router;
