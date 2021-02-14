import { Widget } from '@lumino/widgets';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { PullRequestFileModel, PullRequestModel } from '../../models';
import { PullRequestBrowser } from './PullRequestBrowser';

export class PullRequestBrowserWidget extends Widget {
  private _showTab: (
    data: PullRequestFileModel | PullRequestModel
  ) => Promise<void>;

  constructor(
    showTab: (data: PullRequestFileModel | PullRequestModel) => Promise<void>
  ) {
    super();
    this._showTab = showTab;
    ReactDOM.render(<PullRequestBrowser showTab={this._showTab} />, this.node);
  }

  onUpdateRequest(): void {
    ReactDOM.unmountComponentAtNode(this.node);
    ReactDOM.render(<PullRequestBrowser showTab={this._showTab} />, this.node);
  }
}
