import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import { PullRequestPanel } from './PullRequestPanel';

export class PullRequestToolbar extends Toolbar {
  private _openRefreshButton: ToolbarButton;

  constructor(panel: PullRequestPanel) {
    super();
    this.addClass('jp-PullRequestToolbar');

    // Add toolbar header
    const widget: Widget = new Widget();
    const title = document.createElement('h2');
    title.innerText = 'Pull Requests';
    widget.addClass('jp-PullRequestToolbarHeader');
    widget.node.appendChild(title);
    this.addItem('Widget', widget);

    // Add toolbar refresh button
    this._openRefreshButton = new ToolbarButton({
      onClick: () => {
        panel.update();
      },
      iconClass: 'jp-Refresh-icon jp-Icon jp-Icon-16',
      tooltip: 'Refresh'
    });
    this._openRefreshButton.addClass('jp-PullRequestToolbarItem');
    this.addItem('Refresh', this._openRefreshButton);
  }
}
