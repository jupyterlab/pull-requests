import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { PullRequestPanel } from './components/PullRequestPanel';

import '@jupyterlab/git/style/index.css';
import '@jupyterlab/git/style/variables.css';

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
  const prPanel = new PullRequestPanel(app, themeManager, renderMime);
  restorer.add(prPanel, NAMESPACE);
  app.shell.add(prPanel, 'left', { rank: 200 }); // rank chosen from similar open source extensions
  return;
}

export default pullRequestPlugin;
