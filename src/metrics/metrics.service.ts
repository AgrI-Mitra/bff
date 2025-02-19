import { Injectable, OnModuleInit } from '@nestjs/common';
import { Gauge, Registry } from 'prom-client';
// import { HealthService } from '../health/health.service';
import { HealthService } from 'src/modules/health/health.service';
import { ServiceHealthInfo } from 'src/modules/health/types/health.types';
// import { ServiceHealthInfo } from '../health/types/health.types';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;
  private readonly serviceHealthGauges: Map<string, Gauge<string>>;

  constructor(private readonly healthService: HealthService) {
    this.registry = new Registry();
    this.serviceHealthGauges = new Map();
  }

  async onModuleInit() {
    // Initialize gauges for each service
    const services = ['Postgres', 'Redis', 'bhashini', 'Wadhwani LLM', 'PM Kisan'];
    
    services.forEach(service => {
      this.serviceHealthGauges.set(
        service,
        new Gauge({
          name: `service_health_status_${service.toLowerCase().replace(' ', '_')}`,
          help: `Health status for ${service} (1 = healthy, 0 = unhealthy)`,
          registers: [this.registry]
        })
      );
    });

    // Start periodic health checks
    this.startHealthChecks();
  }

  private async startHealthChecks() {
    const updateMetrics = async () => {
      console.log("Starting the health check update");
      const healthStatus = await this.healthService.checkAllServices();
      console.log("Health status response:", JSON.stringify(healthStatus, null, 2));

      console.log("the health status is: ", healthStatus);
      
      // Update gauges based on health check results
      console.log("Healthy services:", Object.keys(healthStatus.info));

      Object.entries(healthStatus.info).forEach(([name, info]: [string, ServiceHealthInfo]) => {
        const gauge = this.serviceHealthGauges.get(name);
        console.log(`Setting gauge for ${name}:`, {
          hasGauge: !!gauge,
          isAvailable: info.status.isAvailable,
          value: info.status.isAvailable ? 1 : 0
        });
        if (gauge) {
          gauge.set(info.status.isAvailable ? 1 : 0);
        }
      });
      console.log("Unhealthy services:", Object.keys(healthStatus.error));

      Object.entries(healthStatus.error).forEach(([name, info]: [string, ServiceHealthInfo]) => {
        const gauge = this.serviceHealthGauges.get(name);
        console.log(`Setting error gauge for ${name}:`, {
          hasGauge: !!gauge,
          error: info.error
        });
        if (gauge) {
          gauge.set(0);
        }
      });
    };

    // Initial update
    await updateMetrics();

    //update after every 3 hours
    setInterval(async () => {
      await updateMetrics();
    }, 10800000); //3 hours
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async forceUpdate(): Promise<void> {
    const healthStatus = await this.healthService.checkAllServices();
    
    Object.entries(healthStatus.info).forEach(([name, info]: [string, ServiceHealthInfo]) => {
      const gauge = this.serviceHealthGauges.get(name);
      if (gauge) {
        gauge.set(info.status.isAvailable ? 1 : 0);
      }
    });

    Object.entries(healthStatus.error).forEach(([name, info]: [string, ServiceHealthInfo]) => {
      const gauge = this.serviceHealthGauges.get(name);
      if (gauge) {
        gauge.set(0);
      }
    });
  }
}