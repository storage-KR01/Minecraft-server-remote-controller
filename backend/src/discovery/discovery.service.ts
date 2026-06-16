import { Injectable } from '@nestjs/common';

export type DiscoveredServer = {
  id: string;
  unit: string;
  description?: string;
  activeState?: string;
  subState?: string;
  hasServerProperties: boolean;
};

@Injectable()
export class DiscoveryService {
  async discover(): Promise<DiscoveredServer[]> {
    return [];
  }
}

