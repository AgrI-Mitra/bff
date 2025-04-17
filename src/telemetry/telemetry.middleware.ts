import { FastifyRequest, FastifyReply } from "fastify";
import { UAParser } from "ua-parser-js";
import * as crypto from "crypto";
import * as si from "systeminformation";
import { PrismaService } from "../global-services/prisma.service";
import fetch from "node-fetch";
import { addToTelemetryBatch } from "./telemetry-processor";

export async function telemetryMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const prisma = new PrismaService();

  try {
    const userId = request.headers["user-id"] as string;
    const sessionId = request.headers["session-id"] as string;
    const body = request.body as any;
    const lat = body?.location?.lat || null;
    const long = body?.location?.long || null;
    const inputLanguage = body?.inputLanguage || null;

    const userAgent = request.headers["user-agent"] || "";
    const ip =
      (request.headers["x-forwarded-for"] as string) || request.ip || "";
    const did = generateDeviceId(userAgent, ip);

    const parser = new UAParser();
    parser.setUA(userAgent);
    const uaResult = parser.getResult();

    const deviceName = await getDeviceName();
    const { state, district } = await getLocationDetails(lat, long);
    const device = parser.getDevice();
    const deviceType =
      device.type ||
      uaResult.device?.type ||
      (/mobile/i.test(userAgent)
        ? "mobile"
        : /tablet|iPad/i.test(userAgent)
        ? "tablet"
        : "desktop");

    const deviceInfo = {
      did,
      browserName: uaResult.browser.name || "unknown",
      deviceType,
      deviceName,
      osName: uaResult.os.name || "unknown",
      latitude: isNaN(lat) ? null : lat,
      longitude: isNaN(long) ? null : long,
      state,
      district,
      language: inputLanguage,
      userId,
      sessionId,
    };
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (userExists) {
      await prisma.deviceMetrics.create({ data: deviceInfo });
    } else {
      addToTelemetryBatch(deviceInfo); // use batch
    }
  } catch (error) {
    console.error("Error in telemetry middleware:", error);
    reply.code(500).send("Internal Server Error");
  }
}

function generateDeviceId(userAgent: string, ip: string): string {
  return crypto
    .createHash("sha256")
    .update(userAgent + ip)
    .digest("hex");
}

async function getDeviceName(): Promise<string> {
  try {
    const systemInfo = await si.system();
    return `${systemInfo.manufacturer} ${systemInfo.version}`.trim();
  } catch (error) {
    console.error("Error fetching system info:", error);
    return "Unknown Device";
  }
}

async function getLocationDetails(lat: number, lon: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
    );
    const data = await response.json();
    const address = data?.address || {};
    return {
      state: address.state || null,
      district: address.state_district || address.county || null,
    };
  } catch (e) {
    return { state: null, district: null };
  }
}
