import { DocumentRegistry } from '@jupyterlab/docregistry';
import { CommandRegistry } from '@lumino/commands';
import * as React from 'react';
import { IPullRequestGroup } from '../../tokens';
import { PullRequestItem } from './PullRequestItem';

/**
 * BrowserGroup properties
 */
export interface IBrowserGroupProps {
  /**
   * Jupyter Front End Commands Registry
   */
  commands: CommandRegistry;
  /**
   * The document registry
   */
  docRegistry: DocumentRegistry;
  /**
   * Group of Pull Requests
   */
  group: IPullRequestGroup;
}

/**
 * BrowserGroup component
 *
 * @param props Component properties
 */
export function BrowserGroup(props: IBrowserGroupProps): JSX.Element {
  return (
    <li className="jp-PullRequestBrowserGroup">
      <header>
        <h2>{props.group.name}</h2>
      </header>
      {props.group.error ? (
        <h2 className="jp-PullRequestBrowserGroupError">
          <span style={{ color: 'var(--jp-ui-font-color1)' }}>
            Error Listing Pull Requests:
          </span>{' '}
          {props.group.error}
        </h2>
      ) : (
        <ul className="jp-PullRequestBrowserGroupList">
          {props.group.pullRequests.map(pullRequest => (
            <PullRequestItem
              key={pullRequest.id}
              commands={props.commands}
              docRegistry={props.docRegistry}
              pullRequest={pullRequest}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
