import { ReactWidget } from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { CommandRegistry } from '@lumino/commands';
import { Message } from '@lumino/messaging';
import React, { useEffect, useState } from 'react';
import { BeatLoader } from 'react-spinners';
import { IPullRequest, IPullRequestGroup } from '../tokens';
import { requestAPI } from '../utils';
import { Browser } from './browser/Browser';
import { Toolbar } from './Toolbar';

/**
 * React wrapper to mount and umount the React child component
 * when the widget is shown/hidden.
 *
 * In this case this is particularly interesting to trigger the
 * useEffect of the React widget to update the pull requests list
 * each time the user come back to the panel.
 */
export class PullRequestPanelWrapper extends ReactWidget {
  constructor(commands: CommandRegistry, docRegistry: DocumentRegistry) {
    super();
    this._commands = commands;
    this._docRegistry = docRegistry;
  }

  onBeforeShow(msg: Message): void {
    super.onBeforeShow(msg);
    this.update();
  }

  onBeforeHide(msg: Message): void {
    super.onBeforeHide(msg);
    this.onBeforeDetach(msg);
  }

  render(): JSX.Element {
    return (
      this.isAttached &&
      this.isVisible && (
        <PullRequestPanel
          commands={this._commands}
          docRegistry={this._docRegistry}
        />
      )
    );
  }

  private _commands: CommandRegistry;
  private _docRegistry: DocumentRegistry;
}

/**
 * PullRequestPanel properties
 */
export interface IPullRequestPanelProps {
  /**
   * Jupyter Front End Commands Registry
   */
  commands: CommandRegistry;
  /**
   * Document registry
   */
  docRegistry: DocumentRegistry;
}

/**
 * Available pull request filter
 */
type Filter = 'created' | 'assigned';

/**
 * Pull request filter
 */
interface IFilter {
  /**
   * Filter name
   */
  name: string;
  /**
   * Filter type
   */
  filter: Filter;
}

/**
 * Get a group of pull requests for each filters
 *
 * @param filters Filter types
 * @returns The group of pull requests
 */
async function fetchPullRequests(
  filters: IFilter[]
): Promise<IPullRequestGroup[]> {
  return Promise.all(
    filters.map(async (filter: IFilter): Promise<IPullRequestGroup> => {
      try {
        const pullRequests = await requestAPI<IPullRequest[]>(
          'pullrequests/prs/user?filter=' + filter.filter,
          'GET'
        );
        return {
          name: filter.name,
          pullRequests
        };
      } catch (err) {
        let error = 'Unknown Error';
        if (err.response?.status && err.message) {
          error = `${err.response.status} (${err.message})`;
        }
        return {
          name: filter.name,
          pullRequests: [],
          error
        };
      }
    })
  );
}

/**
 * PullRequestPanel component
 *
 * @param props PullRequestPanel properties
 */
export function PullRequestPanel(props: IPullRequestPanelProps): JSX.Element {
  const [pullRequests, setPullRequests] = useState<IPullRequestGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshPullRequests = (): void => {
    setIsLoading(true);
    fetchPullRequests([
      {
        name: 'Created by Me',
        filter: 'created'
      },
      {
        name: 'Assigned to Me',
        filter: 'assigned'
      }
    ])
      .then(data => {
        setPullRequests(data);
        setIsLoading(false);
      })
      .catch(reason => {
        console.error('Failed to fetch pull requests', reason);
        setPullRequests([]);
        setIsLoading(false);
      });
  };

  useEffect(refreshPullRequests, []);

  return (
    <div className="jp-PullRequestPanel">
      <Toolbar onRefresh={refreshPullRequests} />
      {isLoading ? (
        <BeatLoader
          sizeUnit={'px'}
          size={5}
          color={'var(--jp-ui-font-color1)'}
          loading={isLoading}
        />
      ) : (
        <Browser
          docRegistry={props.docRegistry}
          commands={props.commands}
          prGroups={pullRequests}
        />
      )}
    </div>
  );
}
