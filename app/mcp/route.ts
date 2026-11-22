import { env } from 'cloudflare:workers';
import { handle } from '../../lib/pet-http.mjs';
export const dynamic = 'force-dynamic';
export const POST = (request: Request) => handle(request, env);
