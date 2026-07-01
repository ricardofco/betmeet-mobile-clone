import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { handlers } from './handlers';

/**
 * Mirrors mobile's BackendApiClient exactly: `POST ${baseUrl}/${capability}`
 * (backend-api-client.ts:65), Bearer JWT, `capability` is a stable string
 * key, not a REST resource path. One dynamic route dispatches to the handler
 * map rather than one `app.post` per capability.
 */
export const capabilitiesRouter = Router();

capabilitiesRouter.post('/:capability', requireAuth, async (req, res) => {
  const capability = String(req.params.capability);
  const handler = handlers[capability];
  if (!handler) {
    res.status(404).json({ error: `Unknown capability: ${capability}` });
    return;
  }

  try {
    const result = await handler((req as AuthedRequest).auth, req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error(`[capability:${capability}]`, err);
    res.status(500).json({ error: 'Internal error', capability });
  }
});
