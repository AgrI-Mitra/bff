import { registerAs } from '@nestjs/config';

export const healthConfig = registerAs('health', () => ({
  bhashini: {
    baseUrl: process.env.BHASHINI_DHRUVA_ENDPOINT,
    apiKey: process.env.BHASHINI_DHRUVA_AUTHORIZATION,
    timeout: parseInt(process.env.BHASHINI_API_TIMEOUT) || 40000,
  },
  wadhwani: {
    baseUrl: process.env.WADHWANI_BASE_URL,
    apiKey: process.env.WADHWANI_API_KEY,
  },
  pmKisan: {
    baseUrl: process.env.PM_KISAN_BASE_URL,
    apiKey: process.env.PM_KISSAN_TOKEN,
    encDecUrl: process.env.PM_KISAN_ENC_DEC_API,
  },
  ulca: {
    configUrl: process.env.ULCA_CONFIG_URL,
    apiKey: process.env.ULCA_API_KEY,
    userId: process.env.ULCA_USER_ID,
  }
}));