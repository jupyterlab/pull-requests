import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

// API request wrapper
export async function requestAPI<T>(
  url: string,
  method: string,
  request?: object
): Promise<T> {
  const fullRequest = {
    method: method,
    body: JSON.stringify(request)
  };
  const setting = ServerConnection.makeSettings();
  const fullUrl = URLExt.join(setting.baseUrl, url);
  const response = await ServerConnection.makeRequest(
    fullUrl,
    fullRequest,
    setting
  );
  if (!response.ok) {
    throw new ServerConnection.ResponseError(response);
  }
  return response.json();
}
