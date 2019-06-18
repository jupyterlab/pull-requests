import { Widget } from "@phosphor/widgets";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { PullRequestFileModel } from "../../models";
import { PullRequestBrowser } from "./PullRequestBrowser";

export class PullRequestBrowserWidget extends Widget {
  private _showTab: (data: PullRequestFileModel) => Promise<void>;

  constructor(showTab: (data: PullRequestFileModel) => Promise<void>) {
    super();
    this._showTab = showTab;
    ReactDOM.render(<PullRequestBrowser showTab={this._showTab} />, this.node);
  }

  onUpdateRequest(): void {
    ReactDOM.unmountComponentAtNode(this.node);
    ReactDOM.render(<PullRequestBrowser showTab={this._showTab} />, this.node);
  }
}
