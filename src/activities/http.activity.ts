import { Injectable } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class HttpActivity {
  async makeHttpRequest(args: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: any;
  }) {
    console.log(`[HTTP] ${args.method} ${args.url}`);

    try {
      const config: AxiosRequestConfig = {
        method: args.method,
        url: args.url,
        headers: args.headers || {},
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
        data: args.body,
        validateStatus: () => true,
      };

      const response = await axios(config);

      return {
        status: response.status,
        statusText: response.statusText,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
        data: response.data,
      };
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Langchain internal dynamic types / Third party library types
      console.error('[HTTP] Failed:', error.message);
      return {
        status: 500,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- Langchain internal dynamic types / Third party library types
        error: error.message,
        data: null,
      };
    }
  }
}
