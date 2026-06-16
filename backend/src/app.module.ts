import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { GitBackupModule } from './git-backup/git-backup.module';
import { HealthModule } from './health/health.module';
import { RconModule } from './rcon/rcon.module';
import { SystemdModule } from './systemd/systemd.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    DiscoveryModule,
    SystemdModule,
    RconModule,
    GitBackupModule,
    HealthModule
  ]
})
export class AppModule {}

