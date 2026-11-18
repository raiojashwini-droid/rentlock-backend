export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OWNER: 'owner',
  TENANT: 'tenant',
} as const;

export type UserRoleType = (typeof ROLES)[keyof typeof ROLES];

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    canViewTenants: true,
    canAddTenants: true,
    canEditTenants: true,
    canDeleteTenants: true,
    canViewProperties: true,
    canAddProperties: true,
    canEditProperties: true,
    canDeleteProperties: true,
  },
  manager: {
    canViewTenants: true,
    canAddTenants: true,
    canEditTenants: true,
    canDeleteTenants: false,
    canViewProperties: true,
    canAddProperties: false,
    canEditProperties: true,
    canDeleteProperties: false,
  },
  owner: {
    canViewTenants: true,
    canAddTenants: false,
    canEditTenants: false,
    canDeleteTenants: false,
    canViewProperties: true,
    canAddProperties: false,
    canEditProperties: false,
    canDeleteProperties: false,
  },
  tenant: {
    canViewTenants: false,
    canAddTenants: false,
    canEditTenants: false,
    canDeleteTenants: false,
    canViewProperties: false,
    canAddProperties: false,
    canEditProperties: false,
    canDeleteProperties: false,
  },
} as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_MANAGER_CAP_USD = 1000;
