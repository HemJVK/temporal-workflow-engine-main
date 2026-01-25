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
        data: args.body,
        validateStatus: () => true,
      };

      const response = await axios(config);

      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      };
    } catch (error: any) {
      console.error('[HTTP] Failed:', error.message);
      return {
        status: 500,
        error: error.message,
        data: null,
      };
    }
  }
}
