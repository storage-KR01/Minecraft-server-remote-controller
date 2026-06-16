import { BadRequestException, Injectable } from '@nestjs/common';

const allowedOperations = new Set(['daemon-reload', 'start', 'stop', 'restart', 'status', 'journal']);

@Injectable()
export class SystemdService {
  assertAllowed(operation: string) {
    if (!allowedOperations.has(operation)) {
      throw new BadRequestException('Unsupported systemd operation');
    }
  }

  listAllowedOperations() {
    return [...allowedOperations];
  }
}

