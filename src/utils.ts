import { ServerConnection } from '@jupyterlab/services';

// API request wrapper
function httpRequest(
  url: string,
  method: string,
  request?: Record<string, any>
): Promise<Response> {
  const fullRequest = {
    method: method,
    body: JSON.stringify(request)
  };
  const setting = ServerConnection.makeSettings();
  const fullUrl = setting.baseUrl + url;
  return ServerConnection.makeRequest(fullUrl, fullRequest, setting);
}

export async function doRequest(
  url: string,
  method: string,
  request?: object
): Promise<any> {
  const response = await httpRequest(url, method, request);
  if (response.status !== 200) {
    throw new ServerConnection.ResponseError(response);
  }
  return response.json();
}
