import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { PathExt } from '@jupyterlab/coreutils';
import { diffIcon } from '@jupyterlab/git/lib/style/icons';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Widget } from '@lumino/widgets';
import { PullRequestPanelWrapper } from './components/PullRequestPanel';
import { DescriptionWidget } from './components/tab/DescriptionWidget';
import { FileDiffWidget } from './components/tab/FileDiffWidget';
import { pullRequestsIcon } from './style/icons';
import {
  CommandIDs,
  IFile,
  IPullRequest,
  NAMESPACE,
  PLUGIN_ID
} from './tokens';

// JupyterLab plugin props
const pullRequestPlugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  requires: [ILayoutRestorer, IRenderMimeRegistry],
  optional: [ISettingRegistry],
  activate: activate,
  autoStart: true
};

/**
 * Search for a widget in the shell main area
 *
 * @param shell JupyterLab shell
 * @param id Widget id
 */
function findWidget(
  shell: JupyterFrontEnd.IShell,
  id: string
): Widget | undefined {
  const mainAreaItems = shell.widgets('main');
  let mainAreaItem = mainAreaItems.next();
  while (mainAreaItem) {
    if (mainAreaItem.id === id) {
      break;
    }
    mainAreaItem = mainAreaItems.next();
  }
  return mainAreaItem;
}

function activate(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer,
  renderMime: IRenderMimeRegistry,
  settingsRegistry: ISettingRegistry | null
): void {
  const { commands, shell } = app;

  // Add commands
  commands.addCommand(CommandIDs.prOpenDescription, {
    label: 'Open Pull Request Description',
    caption: 'Open Pull Request Description in a New Tab',
    execute: args => {
      const pullRequest = args.pullRequest as any as IPullRequest;
      if (!pullRequest) {
        return;
      }

      // Check if the panel is already open or not
      let mainAreaItem = findWidget(shell, pullRequest.id);

      if (!mainAreaItem) {
        mainAreaItem = new DescriptionWidget({
          pullRequest,
          renderMime
        });
        mainAreaItem.id = pullRequest.id;
        mainAreaItem.title.label = pullRequest.title;
        mainAreaItem.title.caption = pullRequest.title;
        mainAreaItem.title.icon = pullRequestsIcon;
        mainAreaItem.title.closable = true;
        shell.add(mainAreaItem, 'main');
      }

      shell.activateById(mainAreaItem.id);
    }
  });

  commands.addCommand(CommandIDs.prOpenDiff, {
    label: 'Open Pull Request File Diff',
    caption: 'Open Pull Request File Diff in a New Tab',
    execute: args => {
      const { pullRequest, file } = args as any as {
        pullRequest: IPullRequest;
        file: IFile;
      };
      if (!pullRequest || !file) {
        return;
      }

      // Check if the panel is already open or not
      const id = `${pullRequest.internalId}-${file.name}`;
      let mainAreaItem = findWidget(shell, id);

      if (!mainAreaItem) {
        mainAreaItem = new FileDiffWidget({
          filename: file.name,
          pullRequestId: pullRequest.id,
          renderMime,
          settingsRegistry
        });
        mainAreaItem.id = id;
        mainAreaItem.title.label = PathExt.basename(file.name);
        mainAreaItem.title.caption = file.name;
        mainAreaItem.title.icon = diffIcon;
        mainAreaItem.title.closable = true;
        shell.add(mainAreaItem, 'main');
      }

      shell.activateById(mainAreaItem.id);
    }
  });

  // Create the Pull Request widget sidebar
  const prPanel = new PullRequestPanelWrapper(commands, app.docRegistry);
  prPanel.id = 'pullRequests';
  prPanel.title.icon = pullRequestsIcon;
  prPanel.title.caption = 'Pull Requests';

  // Let the application restorer track the running panel for restoration
  restorer.add(prPanel, NAMESPACE);

  // Add the panel to the sidebar
  shell.add(prPanel, 'right', { rank: 1000 });
}

export default pullRequestPlugin;
