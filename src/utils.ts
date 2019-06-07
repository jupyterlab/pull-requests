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
    this.id = result["id"];
    this.title = result["title"];
    this.body = result["body"];
    this.prurl = result["pull_request"]["url"];
    this.isExpanded = false;
  }

  async getFiles() {
    return new Promise<void>((resolve, reject) => {
      apiRequest("/pullrequests/prs/files?id=" + this.prurl)
        .then(data => {
          let jsonresults = JSON.parse(JSON.stringify(data));
          let results: PullRequestItemFile[] = [];
          for (let i in jsonresults) {
            results.push(
              new PullRequestItemFile(JSON.stringify(jsonresults[i]), this)
            );
          }
          this.files = results;
          resolve();
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  id: string;
  title: string;
  body: string;
  prurl: string;
  files: PullRequestItemFile[];
  isExpanded: boolean;
}

export class PullRequestItemFile {
  constructor(json: string, pr: PullRequestItem) {
    let result = JSON.parse(json);
    this.pr = pr;
    this.name = result["filename"];
    this.url = result["raw_url"];
    this.status = result["status"];
    this.id = this.pr.id + "-" + this.name;
  }

  id: string;
  name: string;
  url: string;
  status: string;
  pr: PullRequestItem;
}
