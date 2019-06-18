import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from "@jupyterlab/application";
import { IThemeManager } from "@jupyterlab/apputils";
import "../style/index.css";
import { PullRequestPanel } from "./components/PullRequestPanel";

const NAMESPACE = "pullrequests";
const PLUGIN_ID = "@jupyterlab/pullrequests";

// JupyterLab plugin props
const pullRequestPlugin: JupyterLabPlugin<void> = {
  id: PLUGIN_ID,
  requires: [ILayoutRestorer, IThemeManager],
  activate: activate,
  autoStart: true
};

// Master extension activate
function activate(
  app: JupyterLab,
  restorer: ILayoutRestorer,
  themeManager: IThemeManager
): void {
  const prPanel = new PullRequestPanel(app, themeManager);
  restorer.add(prPanel, NAMESPACE);
  app.shell.addToLeftArea(prPanel, { rank: 200 }); // rank chosen from similar open source extensions
  return;
}

export default pullRequestPlugin;
