/*
 * @Author: Diana Tang
 * @Date: 2025-05-06 18:24:06
 * @LastEditors: Diana Tang
 * @Description: some description
 * @FilePath: /nestjs-starter-rest-api/src/shared/interceptors/logging.interceptor.spec.ts
 */
import { ExecutionContext } from '@nestjs/common';

import { AppLogger } from '../logger/logger.service';
import * as utils from '../request-context/util';
import { LoggingInterceptor } from './logging.interceptor';

jest.mock('../request-context/util', () => ({
  createRequestContext: jest.fn(),
}));

describe('LoggingInterceptor', () => {
  let loggingInterceptor: LoggingInterceptor;

  const mockRequest = {
    headers: {},
    url: 'mock-url',
    header: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: jest.fn().mockReturnThis(),
    getRequest: jest.fn().mockReturnThis(),
  } as unknown as ExecutionContext;

  const mockCallHandler = {
    handle: jest.fn(),
    pipe: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    loggingInterceptor = new LoggingInterceptor(new AppLogger());
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(loggingInterceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('intercept', async () => {
      (
        mockExecutionContext.switchToHttp().getRequest as jest.Mock<any, any>
      ).mockReturnValueOnce(mockRequest);
      mockCallHandler.handle.mockReturnValueOnce({
        pipe: jest.fn(),
      });

      loggingInterceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockExecutionContext.switchToHttp().getRequest).toHaveBeenCalled();
      expect(utils.createRequestContext).toHaveBeenCalledWith(mockRequest);
    });
  });
});
