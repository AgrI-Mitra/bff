export type ServiceType = 'internal' | 'external';

export interface ServiceStatus {
  isAvailable: boolean;
}

export interface SLA {
  timeForResolutionInMinutes: number;
  priority: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  info: Record<string, ServiceHealthInfo>;
  error: Record<string, ServiceHealthInfo>;
  details: Record<string, any>;
}

export interface ServiceHealthInfo {
  status: ServiceStatus;
  name: string;
  type: ServiceType;
  impactMessage: string;
  error?: string;
  sla: SLA;
}