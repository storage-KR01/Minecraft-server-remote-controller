import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AUDIT_KEY, AuditMetadata } from './audit.decorator';

type AuditedRequest = Request & {
  user?: {
    id: string;
    username: string;
    role: 'Admin' | 'Operator' | 'Viewer';
    mustChangePassword: boolean;
  };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditedRequest>();

    return next.handle().pipe(
      tap(() => {
        void this.audit.record({
          actorUserId: request.user?.id ?? null,
          action: metadata.action,
          targetType: metadata.targetType ?? 'system',
          targetId: metadata.targetIdParam ? String(request.params?.[metadata.targetIdParam] ?? null) : null,
          metadata: {
            body: request.body,
            params: request.params,
            query: request.query
          }
        });
      })
    );
  }
}