/**
 * Vercel Serverless Function per tRPC
 * Wrappa il middleware Express tRPC per funzionare su Vercel
 */

import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '../../server/routers';
import { createContext } from '../../server/_core/context';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Crea il middleware tRPC Express
const trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
});

// Handler per Vercel Serverless Function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Wrappa req/res per Express middleware
  return trpcMiddleware(req as any, res as any, () => {
    res.status(404).json({ error: 'Not found' });
  });
}
