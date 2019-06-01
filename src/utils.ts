import { ServerConnection } from "@jupyterlab/services";

// API request wrapper
export function apiRequest<T>(url: string): Promise<T> {
  return window.fetch(url).then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        throw new ServerConnection.ResponseError(response, data["error"]);
      });
    }
    return response.json();
  });
}

// A class for the neccessary items in GitHub PR json response
// Extendable to other source control libraries (eg CodeCommit) in the future
export class PullRequestItem {
  constructor(json: string) {
    let result = JSON.parse(json);
    this.title = result["title"];
    this.body = result["body"];
    this.id = result["id"];
  }

  title: string;
  body: string;
  id: string;
}
