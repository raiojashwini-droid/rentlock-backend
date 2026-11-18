import { AuthUserPayload, EffectivePermissions } from './index.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
      permissions?: EffectivePermissions;
    }
  }
}

export {};
