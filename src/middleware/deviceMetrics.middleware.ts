import { Injectable, NestMiddleware,Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import {UAParser} from "ua-parser-js";
import { PrismaService } from "../global-services/prisma.service";
import * as crypto from "crypto";
const si = require("systeminformation");

// Extend Express Request type
interface CustomRequest extends Request {
  deviceMetrics?: any;
}

@Injectable()
export class DeviceInfoMiddleware implements NestMiddleware {
  private logger: Logger;
  constructor(private readonly prismaService: PrismaService,
  ) {
    this.logger = new Logger();
  }

  private generateDeviceId(userAgent: string, ip: string): string {
    return crypto.createHash("sha256").update(userAgent + ip).digest("hex");
  }

  async getDeviceName(): Promise<string> {
    try {
      const systemInfo = await si.system();      
      return `${systemInfo.manufacturer} ${systemInfo.version}`.trim();  
    } catch (error) {
      console.error("Error fetching system info:", error);
      return "Unknown Device";
    }
  }

  async use(req: CustomRequest, res: Response, next: NextFunction) {
    try {
      const userAgent = req.headers["user-agent"] || "";
      const ip =
        (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "";

      // Generate unique device ID
      const did = this.generateDeviceId(userAgent, ip);

      // Parse device info
      const parser = new UAParser();
      parser.setUA(userAgent);
      
      const device = parser.getDevice();
      const os = parser.getOS();
      const uaResult = parser.getResult();

      // Extract device type
      let deviceType = device.type || uaResult.device?.type || 
        (/mobile/i.test(userAgent) ? "mobile" : /tablet|iPad/i.test(userAgent) ? "tablet" : "desktop");

        let deviceName = await this.getDeviceName();

      const latitude = req.headers["lat"] ? parseFloat(req.headers["lat"] as string) : null;
      const longitude = req.headers["long"] ? parseFloat(req.headers["long"] as string) : null;


      // Build device info object
      const deviceInfo = {
        did,
        browserName: uaResult.browser.name || "unknown",
        deviceType,
        deviceName,  
        osName: os.name || "unknown",
        latitude: isNaN(latitude) ? null : latitude,
        longitude: isNaN(longitude) ? null : longitude,
        userId: (req.headers["user-id"] as string) || null,
        sessionId: (req.headers["session-id"] as string) || null,
      };

     this.logger.log("DEVICE INFO ->>>>>", deviceInfo);

      // Save device metrics
      await this.prismaService.deviceMetrics.create({ data: deviceInfo });

      req.deviceMetrics = deviceInfo;

      next();
    } catch (error) {
      console.error("Error processing device information:", error);
      res.status(500).send("Internal Server Error");
    }
  }
}
