import { SetMetadata } from '@nestjs/common';

export type AuditMetadata = {
  action: string;
  targetType?: string;
  targetIdParam?: string;
};

export const AUDIT_KEY = 'audit';

export const Audit = (metadata: AuditMetadata) => SetMetadata(AUDIT_KEY, metadata);