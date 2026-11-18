import { UserRole } from '@prisma/client';

export interface AuthUserPayload {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface EffectivePermissions {
  canViewTenants: boolean;
  canAddTenants: boolean;
  canEditTenants: boolean;
  canDeleteTenants: boolean;
  canViewProperties: boolean;
  canAddProperties: boolean;
  canEditProperties: boolean;
  canDeleteProperties: boolean;
  isCustomOverride?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
