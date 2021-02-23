import { DocumentRegistry } from '@jupyterlab/docregistry';
import { CommandRegistry } from '@lumino/commands';
import * as React from 'react';
import { IPullRequestGroup } from '../../tokens';
import { PullRequestItem } from './PullRequestItem';

export interface IPullRequestBrowserItemProps {
  /**
   * Jupyter Front End Commands Registry
   */
  commands: CommandRegistry;
  docRegistry: DocumentRegistry;
  /**
   * Group of Pull Request Lists
   */
  group: IPullRequestGroup;
}

export function PullRequestBrowserItem(
  props: IPullRequestBrowserItemProps
): JSX.Element {
  return (
    <li className="jp-PullRequestBrowserItem">
      <header>
        <h2>{props.group.name}</h2>
      </header>
      {props.group.error ? (
        <h2 className="jp-PullRequestBrowserItemError">
          <span style={{ color: 'var(--jp-ui-font-color1)' }}>
            Error Listing Pull Requests:
          </span>{' '}
          {props.group.error}
        </h2>
      ) : (
        <ul className="jp-PullRequestBrowserItemList">
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
