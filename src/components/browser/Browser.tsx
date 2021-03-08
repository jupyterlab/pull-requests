import { DocumentRegistry } from '@jupyterlab/docregistry';
import { CommandRegistry } from '@lumino/commands';
import * as React from 'react';
import { IPullRequestGroup } from '../../tokens';
import { BrowserGroup } from './BrowserGroup';

/**
 * PullRequestBrowser properties
 */
export interface IBrowserProps {
  /**
   * Jupyter Front End Commands Registry
   */
  commands: CommandRegistry;
  /**
   * The document registry
   */
  docRegistry: DocumentRegistry;
  /**
   * Groups of Pull Request Lists
   */
  prGroups: IPullRequestGroup[];
}

/**
 * Display the Pull Request Lists
 *
 * @param props Component properties
 */
export function Browser(props: IBrowserProps): JSX.Element {
  return (
    <div className="jp-PullRequestBrowser">
      <ul>
        {props.prGroups.map(group => (
          <BrowserGroup
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
