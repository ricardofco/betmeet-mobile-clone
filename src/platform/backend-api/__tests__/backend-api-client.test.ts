import { BackendApiError, getBackendApiClient } from '@/platform/backend-api/backend-api-client';

describe('BackendApiClient (Bolt 0 scaffold)', () => {
  it('throws a BackendApiError, not a raw network error, when no base URL is configured', async () => {
    const client = getBackendApiClient();

    await expect(
      client.request({ capability: 'predictions.save' }),
    ).rejects.toBeInstanceOf(BackendApiError);
  });

  it('the thrown error carries the capability name for debuggability', async () => {
    const client = getBackendApiClient();

    await expect(client.request({ capability: 'pools.create' })).rejects.toMatchObject({
      capability: 'pools.create',
    });
  });
});
