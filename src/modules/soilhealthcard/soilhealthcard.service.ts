import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface SoilHealthResponse {
  data: {
    getTestForAuthUser: Array<{
      id: string;
      computedID: string;
      cycle: string;
      scheme: string;
      farmer: {
        name: string;
        phone: string;
        address: string;
      };
      plot: {
        address: string;
        area: string;
        surveyNo: string;
      };
      results: {
        n: string;
        p: string;
        k: string;
        B: string;
        Fe: string;
        Zn: string;
        Cu: string;
        S: string;
        OC: string;
        pH: string;
        EC: string;
        Mn: string;
      };
      crop: string;
      location: string;
      testparameters: any;
      rdfValues: any;
      status: string;
      testCompletedAt: string;
      sampleDate: string;
      reportData: any;
      district: string;
      block: string;
      village: string;
      fertilizer: any;
      html: string;
      uniqueID: string;
    }>;
  };
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
}

@Injectable()
export class SoilhealthcardService {
  private readonly logger = new Logger(SoilhealthcardService.name);
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private async generateAccessToken(): Promise<string> {
    try {
      if (this.accessToken) {
        this.logger.log('Using cached token:', this.accessToken);
        return this.accessToken;
      }

      const refreshToken = this.refreshToken || this.configService.get('SOIL_HEALTH_TOKEN');
      this.logger.log('Using refresh token:', refreshToken);
      
      const requestBody = {
        query: `query Query($refreshToken: String!) {
          generateAccessToken(refreshToken: $refreshToken)
        }`,
        variables: {
          refreshToken
        }
      };

      const response = await firstValueFrom(
        this.httpService.post(
          this.configService.get('SOIL_HEALTH_BASE_URL'),
          requestBody,
          {
            headers: { 'Content-Type': 'application/json' }
          }
        )
      );

      const tokenResponse = response.data?.data?.generateAccessToken;
      if (!tokenResponse?.token) {
        this.logger.error('Invalid token response structure:', JSON.stringify(response.data, null, 2));
        throw new Error('Invalid response structure from token generation');
      }

      this.accessToken = tokenResponse.token;
      this.refreshToken = tokenResponse.refreshToken;
      
      return this.accessToken; // Return just the token string

    } catch (error) {
      this.logger.error('Token generation error:', {
        message: error.message,
        response: error.response?.data,
        errors: error.response?.data?.errors
      });
      this.accessToken = null;
      this.refreshToken = null;
      throw error;
    }
  }

  async getSoilHealthCard(phoneNumber: string): Promise<any> {
    try {
      const token = await this.generateAccessToken();
      
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      this.logger.log('Making request for phone:', formattedPhone);

      const requestBody = {
        query: `query GetTestForAuthUser($phone: PhoneNumber!, $state: String!, $district: String!, $cycle: String!, $scheme: String!) {
          getTestForAuthUser(
            phone: $phone,
            state: $state,
            district: $district,
            cycle: $cycle,
            scheme: $scheme
          ) {
            id
            computedID
            cycle
            scheme
            plot {
              address
              area
              surveyNo
            }
            farmer {
              address
              name
            }
            crop
            location
            testparameters
            rdfValues
            status
            testCompletedAt
            sampleDate
            reportData
            district
            block
            village
            results
            fertilizer
            html
            uniqueID
          }
        }`,
        variables: {
          phone: formattedPhone,
          state: this.configService.get("SOIL_HEALTH_STATE"),
          district: this.configService.get("SOIL_HEALTH_DISTRICT"),
          cycle: this.configService.get("SOIL_HEALTH_CYCLE"),
          scheme: this.configService.get("SOIL_HEALTH_SCHEME")
        }
      };

      this.logger.log('Soil health request:', {
        url: this.configService.get('SOIL_HEALTH_BASE_URL'),
        headers: {
          'Authorization': `Bearer ${token}`
        },
        variables: requestBody.variables // Log the variables we're sending
      });

      const response = await firstValueFrom(
        this.httpService.post<SoilHealthResponse>(
          this.configService.get('SOIL_HEALTH_BASE_URL'),
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        )
      );

      console.log('Soil health response:', {
        status: response.status,
        data: JSON.stringify(response.data, null, 2),
        errors: response.data?.errors // Log any GraphQL errors
      });

      if (!response.data?.data?.getTestForAuthUser?.length) {
        this.logger.warn('No soil health card found:', {
          phone: formattedPhone,
          response: response.data,
          variables: requestBody.variables // Log the variables that resulted in no data
        });
        throw new Error('No soil health card found for this mobile number');
      }

      const soilHealthData = response.data.data.getTestForAuthUser[0];
      return this.formatSoilHealthResponse(soilHealthData);

    } catch (error) {
      if (error.response?.status === 401) {
        this.logger.warn('Authentication failed, clearing tokens and retrying...');
        this.accessToken = null;
        this.refreshToken = null;
        return this.getSoilHealthCard(phoneNumber);
      }
      this.logger.error('Error fetching soil health card:', {
        message: error.message,
        response: error.response?.data,
        errors: error.response?.data?.errors,
        variables: error.config?.data, // Log the variables that caused the error
        stack: error.stack,
        phone: phoneNumber
      });
      throw new Error(error.response?.data?.message || 'Failed to fetch soil health card');
    }
  }

  private formatSoilHealthResponse(data: any): any {
    try {
      const farmerName = data.farmer?.name || 'Farmer';
      const farmerAddress = data.farmer?.address || 'N/A';
      const plotDetails = data.plot || {};
      const results = data.results || {};
      const htmlContent = data.html || '';

      // Create a structured response
      return {
        type: 'soil_health_card',
        id: data.id,
        content: {
          farmerDetails: {
            name: farmerName,
            address: farmerAddress,
            phone: data.farmer?.phone
          },
          plotDetails: {
            address: plotDetails.address,
            area: plotDetails.area,
            surveyNo: plotDetails.surveyNo
          },
          soilTestResults: {
            nitrogen: results.n,
            phosphorus: results.p,
            potassium: results.k,
            boron: results.B,
            iron: results.Fe,
            zinc: results.Zn,
            copper: results.Cu,
            sulphur: results.S,
            organicCarbon: results.OC,
            pH: results.pH,
            electricalConductivity: results.EC,
            manganese: results.Mn
          },
          crop: data.crop,
          status: data.status,
          uniqueID: data.uniqueID,
          html: this.sanitizeHtml(htmlContent)
        },
        message: `Dear ${farmerName}, here is your Soil Health Card report.`
      };

    } catch (error) {
      this.logger.error('Error formatting soil health response:', error);
      throw new Error('Failed to format soil health card response');
    }
  }

  private sanitizeHtml(html: string): string {
    // Remove potentially harmful scripts
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove inline styles and events
    html = html.replace(/ style="[^"]*"/g, '');
    html = html.replace(/ on\w+="[^"]*"/g, '');
    
    // Add target="_blank" to all links
    html = html.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
    
    return html;
  }

  async validatePhoneNumber(phone: string): Promise<boolean> {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it's a valid 10-digit Indian mobile number
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return false;
    }
    
    return true;
  }
}