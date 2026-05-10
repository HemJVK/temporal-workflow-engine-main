import { Test, TestingModule } from '@nestjs/testing';
import { HttpActivity } from './http.activity';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

describe('HttpActivity', () => {
  let activity: HttpActivity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpActivity],
    }).compile();

    activity = module.get<HttpActivity>(HttpActivity);
  });

  it('should be defined', () => {
    expect(activity).toBeDefined();
  });

  it('should make a successful GET request', async () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      data: { success: true },
    };
    mockedAxios.mockResolvedValueOnce(mockResponse as any);

    const result = await activity.makeHttpRequest({
      method: 'GET',
      url: 'https://example.com/api',
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ success: true });
    expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      url: 'https://example.com/api',
    }));
  });

  it('should handle request errors gracefully', async () => {
    mockedAxios.mockRejectedValueOnce(new Error('Network Error') as any);

    const result = await activity.makeHttpRequest({
      method: 'POST',
      url: 'https://example.com/api',
      body: { foo: 'bar' },
    });

    expect(result.status).toBe(500);
    expect(result.error).toBe('Network Error');
  });
});
