import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { ReadonlyJSONObject } from '@lumino/coreutils';

/**
 * API request wrapper
 *
 * @param url Endpoint to call
 * @param method Request method
 * @param body Request body
 * @returns JSON body of the response
 */
export async function requestAPI<T>(
  url: string,
  method: string,
  body?: ReadonlyJSONObject
): Promise<T> {
  const fullRequest = {
    method: method,
    body: JSON.stringify(body)
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

/**
 * Generate a HTML node.
 *
 * @param tag Node tag
 * @param attributes Node attributes
 * @param text Node text content
 * @param events Node events
 * @returns HTMLElement
 */
export function generateNode(
  tag: string,
  attributes?: { [key: string]: any },
  text?: string,
  events?: {
    [key: string]: EventListenerOrEventListenerObject;
  }
): HTMLElement {
  const node = document.createElement(tag);
  if (attributes) {
    for (const name in attributes) {
      node.setAttribute(name, attributes[name]);
    }
  }

  if (text) {
    node.textContent = text;
  }

  if (events) {
    for (const event in events) {
      node.addEventListener(event, events[event]);
    }
  }

  return node;
}
