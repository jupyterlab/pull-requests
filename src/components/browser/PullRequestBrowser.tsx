import { DocumentRegistry } from '@jupyterlab/docregistry';
import { CommandRegistry } from '@lumino/commands';
import * as React from 'react';
import { IPullRequestGroup } from '../../tokens';
import { PullRequestBrowserItem } from './PullRequestBrowserItem';

export interface IPullRequestBrowserProps {
  /**
   * Jupyter Front End Commands Registry
   */
  commands: CommandRegistry;
  docRegistry: DocumentRegistry;
  /**
   * Groups of Pull Request Lists
   */
  prGroups: IPullRequestGroup[];
}

/**
 * Display the Pull Request Lists
 * @param props Component properties
 */
export function PullRequestBrowser(
  props: IPullRequestBrowserProps
): JSX.Element {
  return (
    <div className="jp-PullRequestBrowser">
      <ul>
        {props.prGroups.map(group => (
          <PullRequestBrowserItem
            key={group.name}
            commands={props.commands}
            docRegistry={props.docRegistry}
            group={group}
          />
        ))}
      </ul>
    </div>
  );
}
