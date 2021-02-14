import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { PullRequestPanel } from './components/PullRequestPanel';
import { pullRequestsIcon } from './style/icons';

const NAMESPACE = 'pullrequests';
const PLUGIN_ID = '@jupyterlab/pullrequests';

// JupyterLab plugin props
const pullRequestPlugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  requires: [ILayoutRestorer, IThemeManager, IRenderMimeRegistry],
  activate: activate,
  autoStart: true
};

// Master extension activate
function activate(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer,
  themeManager: IThemeManager,
  renderMime: IRenderMimeRegistry
): void {
  // Create the Pull Request widget sidebar
  const prPanel = new PullRequestPanel(app, themeManager, renderMime);

  prPanel.id = 'pullrequests';
  prPanel.title.icon = pullRequestsIcon;
  prPanel.title.caption = 'Pull Requests';

  // Let the application restorer track the running panel for restoration
  restorer.add(prPanel, NAMESPACE);

  // Add the panel to the sidebar
  app.shell.add(prPanel, 'left', { rank: 200 });
}

export default pullRequestPlugin;
