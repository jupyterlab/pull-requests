import { ServerConnection } from "@jupyterlab/services";

// API request wrapper
function httpRequest(
  url: string,
  method: string,
  request?: Object
): Promise<Response> {
  let fullRequest = {
    method: method,
    body: JSON.stringify(request)
  };
  let setting = ServerConnection.makeSettings();
  let fullUrl = setting.baseUrl + url;
  return ServerConnection.makeRequest(fullUrl, fullRequest, setting);
}

export async function doRequest (url: string, method: string, request?: object): Promise<any>  {
  try {
    let response = await httpRequest(url, method, request);
    if (response.status !== 200) {
      throw new ServerConnection.ResponseError(response);
    }
    return response.json();
  } catch (err) {
    throw err;
  }
}