import { refreshIcon } from '@jupyterlab/ui-components';
import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';

export class PullRequestToolbar extends Toolbar {
  constructor(onUpdate: () => void) {
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
    const openRefreshButton = new ToolbarButton({
      onClick: onUpdate,
      icon: refreshIcon,
      tooltip: 'Refresh'
    });
    openRefreshButton.addClass('jp-PullRequestToolbarItem');
    this.addItem('Refresh', openRefreshButton);
  }
}
