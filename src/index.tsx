import React from 'react';
import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ReactWidget, MainAreaWidget } from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { diffIcon } from '@jupyterlab/git/lib/style/icons';
import { Widget } from '@lumino/widgets';
import { PullRequestPanel } from './components/PullRequestPanel';
import {
  CommandIDs,
  IFile,
  IPullRequest,
  NAMESPACE,
  PLUGIN_ID
} from './tokens';
import { PullRequestDescriptionTab } from './components/tab/PullRequestDescriptionTab';
import { FileDiffWidget } from './components/tab/PullRequestFileTab';
import { pullRequestsIcon } from './style/icons';

// JupyterLab plugin props
const pullRequestPlugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  requires: [ILayoutRestorer, IRenderMimeRegistry],
  optional: [ISettingRegistry],
  activate: activate,
  autoStart: true
};

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

// Master extension activate
function activate(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer,
  renderMime: IRenderMimeRegistry,
  settings: ISettingRegistry | null
): void {
  const { commands, shell } = app;

  // Add commands
  commands.addCommand(CommandIDs.prOpenDescription, {
    label: 'Open Pull Request Description',
    caption: 'Open Pull Request Description in a New Tab',
    execute: args => {
      const pullRequest = (args.pullRequest as any) as IPullRequest;
      if (!pullRequest) {
        return;
      }

      // Check if the panel is already open or not
      let mainAreaItem = findWidget(shell, pullRequest.id);

      if (!mainAreaItem) {
        mainAreaItem = new MainAreaWidget<PullRequestDescriptionTab>({
          content: new PullRequestDescriptionTab({
            pullRequest,
            renderMimeRegistry: renderMime
          })
        });
        mainAreaItem.id = pullRequest.id;
        mainAreaItem.title.label = pullRequest.title;
        mainAreaItem.title.icon = pullRequestsIcon;
        shell.add(mainAreaItem, 'main');
      }

      shell.activateById(mainAreaItem.id);
    }
  });

  commands.addCommand(CommandIDs.prOpenDiff, {
    label: 'Open Pull Request File Diff',
    caption: 'Open Pull Request File Diff in a New Tab',
    execute: args => {
      const { pullRequest, file } = (args as any) as {
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
        mainAreaItem = new MainAreaWidget<FileDiffWidget>({
          content: new FileDiffWidget({
            filename: file.name,
            pullRequestId: pullRequest.id,
            renderMime
          })
        });
        mainAreaItem.id = id;
        mainAreaItem.title.label = file.name;
        mainAreaItem.title.icon = diffIcon;
        shell.add(mainAreaItem, 'main');
      }

      shell.activateById(mainAreaItem.id);
    }
  });

  // Create the Pull Request widget sidebar
  const prPanel = ReactWidget.create(
    <PullRequestPanel commands={commands} docRegistry={app.docRegistry} />
  );

  prPanel.id = 'pullRequests';
  // prPanel.title.icon = pullRequestsIcon;
  prPanel.title.label = 'PR';
  prPanel.title.caption = 'Pull Requests';

  // Let the application restorer track the running panel for restoration
  restorer.add(prPanel, NAMESPACE);

  // Add the panel to the sidebar
  shell.add(prPanel, 'right', { rank: 200 });
}

export default pullRequestPlugin;
