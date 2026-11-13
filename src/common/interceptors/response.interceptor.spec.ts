import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor.js';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor<unknown>();
  const context = {} as ExecutionContext;
  const handlerReturning = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  it('envolve o payload em { success: true, data }', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(context, handlerReturning({ id: '1' })),
    );

    expect(result).toEqual({ success: true, data: { id: '1' } });
  });

  it('normaliza respostas vazias para data: null', async () => {
    const result = await firstValueFrom(
      interceptor.intercept(context, handlerReturning(undefined)),
    );

    expect(result).toEqual({ success: true, data: null });
  });
});
