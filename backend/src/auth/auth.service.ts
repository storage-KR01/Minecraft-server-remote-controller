import { BadRequestException, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import jwt = require('jsonwebtoken');
import { DatabaseService } from '../database/database.service';

type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  role: 'Admin' | 'Operator' | 'Viewer';
  must_change_password: boolean;
};

type SessionUser = {
  id: string;
  username: string;
  role: 'Admin' | 'Operator' | 'Viewer';
  mustChangePassword: boolean;
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly database: DatabaseService) {}

  async onModuleInit() {
    await this.bootstrapInitialAdmin();
  }

  async login(username: string, password: string) {
    const user = await this.findUserByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionResult = await this.database.query<{ id: string }>(
      `INSERT INTO sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [user.id, 'pending', expiresAt]
    );

    const sessionId = sessionResult.rows[0].id;
    const sessionToken = this.signSessionToken({
      sid: sessionId,
      sub: user.id,
      role: user.role
    });

    await this.database.query('UPDATE sessions SET token_hash = $1 WHERE id = $2', [
      this.hashToken(sessionToken),
      sessionId
    ]);

    return {
      sessionToken,
      user: this.toSessionUser(user)
    };
  }

  async logout(sessionToken?: string) {
    const payload = this.verifySessionToken(sessionToken);
    await this.database.query('UPDATE sessions SET revoked_at = now() WHERE id = $1', [payload.sid]);
  }

  async validateSession(sessionToken?: string): Promise<SessionUser> {
    const payload = this.verifySessionToken(sessionToken);
    const result = await this.database.query<UserRow & { token_hash: string }>(
      `SELECT u.id, u.username, u.password_hash, u.role, u.must_change_password, s.token_hash
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > now()`,
      [payload.sid]
    );

    const row = result.rows[0];
    if (!row || row.token_hash !== this.hashToken(sessionToken ?? '')) {
      throw new UnauthorizedException('Invalid session');
    }

    return this.toSessionUser(row);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 12) {
      throw new BadRequestException('New password must be at least 12 characters');
    }

    const result = await this.database.query<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await this.database.query(
      `UPDATE users
       SET password_hash = $1, must_change_password = false, updated_at = now()
       WHERE id = $2`,
      [hash, userId]
    );
  }

  private async bootstrapInitialAdmin() {
    const existing = await this.database.query<{ count: string }>('SELECT count(*) FROM users');
    if (Number(existing.rows[0].count) > 0) {
      return;
    }

    const username = process.env.INITIAL_ADMIN_USERNAME ?? 'admin';
    const password = randomBytes(18).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);

    await this.database.query(
      `INSERT INTO users (username, password_hash, role, must_change_password)
       VALUES ($1, $2, 'Admin', true)`,
      [username, passwordHash]
    );

    this.logger.warn(`Initial admin created. username=${username} password=${password}`);
    this.logger.warn('Change this password immediately after first login.');
  }

  private async findUserByUsername(username: string): Promise<UserRow | undefined> {
    const result = await this.database.query<UserRow>(
      'SELECT id, username, password_hash, role, must_change_password FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  private signSessionToken(payload: { sid: string; sub: string; role: string }) {
    return jwt.sign(payload, this.jwtSecret(), { expiresIn: '7d', issuer: 'server-control-center' });
  }

  private verifySessionToken(sessionToken?: string): { sid: string; sub: string; role: string } {
    if (!sessionToken) {
      throw new UnauthorizedException('Missing session');
    }

    try {
      return jwt.verify(sessionToken, this.jwtSecret(), {
        issuer: 'server-control-center'
      }) as { sid: string; sub: string; role: string };
    } catch {
      throw new UnauthorizedException('Invalid session');
    }
  }

  private jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    return secret;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private toSessionUser(user: UserRow): SessionUser {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.must_change_password
    };
  }
}
