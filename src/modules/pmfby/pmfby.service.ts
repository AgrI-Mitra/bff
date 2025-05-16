import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PmfbyService {
  private readonly logger = new Logger(PmfbyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get PMFBY authentication token
   */
  async getPmfbyToken(): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.configService.get('PMFBY_BASE_URL')}/api/v2/external/service/login`,
          {
            "deviceType": "web",
            "mobile": "9013617746",
            "otp": 123456,
            "password": "019096071e228ed6611599c83d96783ccf2dcc02790ffe165f7e11e70e5ee1b12ea864dc123eea1367d96ef240cda319180f58d23653890fe5d99e0f911dbb79"
          },
          { 
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      );
      
      console.log('PMFBY API response:', JSON.stringify(response.data, null, 2));
      
      // Check if token exists in the expected location
      if (!response.data) {
        this.logger.error('No data in API response');
        throw new Error('Invalid token response from PMFBY service: No data returned');
      }
      
      // Log the response structure to help identify where the token is
      console.log('Response data structure keys:',response.data);
      
      const token = response.data.data.token 
      console.log('Token:', token);

      if (!token) {
        this.logger.error('Token not found in API response', response.data);
        throw new Error('Invalid token response from PMFBY service: No token found');
      }
      
      return token;
    } catch (error) {
      this.logger.error(`Error getting PMFBY token: ${error.message}`);
      if (error.response) {
        this.logger.error('Error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw new Error(`Failed to get PMFBY token: ${error.message}`);
    }
  }

  /**
   * Get Farmer ID from mobile number
   */
  async getFarmerId(mobileNumber: string): Promise<string> {
    try {
      // Static authToken for demo purposes
      const authToken = "3509AA77-1ABA-410F-9CB2-51D59AAEC0383509AA77-1ABA-410F-9CB2-51D59AAEC038";
      
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.configService.get('PMFBY_BASE_URL')}/api/v1/services/services/farmerMobileExists`,
          {
            params: {
              mobile: mobileNumber,
              authToken: authToken
            }
          }
        )
      );
      console.log('Farmer ID API response:', JSON.stringify(response.data, null, 2));
      
      // Fix: Correctly access farmerID from the nested structure
      const farmerId = response.data.data.result.farmerID;
      console.log('Farmer ID:', farmerId);
      
      if (!farmerId) {
        this.logger.error('Farmer ID not found in API response', response.data);
        throw new Error('Invalid response from PMFBY service: No farmer ID found');
      }
      return farmerId;
    } catch (error) {
      this.logger.error(`Error fetching farmer ID: ${error.message}`);
      throw new Error(`Failed to get farmer ID: ${error.message}`);
    }
  }

  /**
   * Get Claim Status
   */
  async getClaimStatus(farmerId: string, season: string, year: string, token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.configService.get('PMFBY_BASE_URL')}/api/v1/claims/claims/claimSearchReport`,
          {
            params: {
              season: season,
              year: year,
              farmerID: farmerId,
              searchType: 'farmerID'
            },
            headers: {
              'token': token
            }
          }
        )
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching claim status: ${error.message}`);
      throw new Error(`Failed to get claim status: ${error.message}`);
    }
  }

  /**
   * Get Policy Status
   */
  async getPolicyStatus(farmerId: string, season: string, year: string, token: string): Promise<any> {
    try {
      // Construct the sssyID as per requirements: 040${season}00${year}
      const sssyID = `040${season}00${year}`;
      
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.configService.get('PMFBY_BASE_URL')}/api/v1/policy/policy/farmerpolicylist`,
          {
            params: {
              listType: 'POLICY_LIST',
              farmerID: farmerId,
              sssyID: sssyID
            },
            headers: {
              'token': token
            }
          }
        )
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching policy status: ${error.message}`);
      throw new Error(`Failed to get policy status: ${error.message}`);
    }
  }
} 