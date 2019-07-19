import { ILayoutRestorer, JupyterLab, JupyterLabPlugin } from "@jupyterlab/application";
import { IThemeManager } from "@jupyterlab/apputils";
import { IRenderMimeRegistry } from "@jupyterlab/rendermime";
import { PullRequestPanel } from "./components/PullRequestPanel";

import "../style/index.css";
import "@jupyterlab/git/style/diff.css";
import "@jupyterlab/git/style/variables.css";

const NAMESPACE = "pullrequests";
const PLUGIN_ID = "@jupyterlab/pullrequests";

// JupyterLab plugin props
const pullRequestPlugin: JupyterLabPlugin<void> = {
  id: PLUGIN_ID,
  requires: [ILayoutRestorer, IThemeManager, IRenderMimeRegistry],
  activate: activate,
  autoStart: true
};

// Master extension activate
function activate(
  app: JupyterLab,
  restorer: ILayoutRestorer,
  themeManager: IThemeManager,
  renderMime: IRenderMimeRegistry
): void {
  const prPanel = new PullRequestPanel(app, themeManager, renderMime);
  restorer.add(prPanel, NAMESPACE);
  app.shell.addToLeftArea(prPanel, { rank: 200 }); // rank chosen from similar open source extensions
  return;
}

export default pullRequestPlugin;
