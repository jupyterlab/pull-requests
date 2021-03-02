import { DocumentRegistry } from '@jupyterlab/docregistry';
import { CommandRegistry } from '@lumino/commands';
import React, { useEffect, useState } from 'react';
import { BeatLoader } from 'react-spinners';
import { IPullRequest, IPullRequestGroup } from '../tokens';
import { requestAPI } from '../utils';
import { PullRequestBrowser } from './browser/PullRequestBrowser';
import { PullRequestToolbar } from './PullRequestToolbar';

export interface IPullRequestPanelProps {
  /**
   * Jupyter Front End Commands Registry
   */
  commands: CommandRegistry;
  docRegistry: DocumentRegistry;
}

type Filter = 'created' | 'assigned';

interface IFilter {
  name: string;
  filter: Filter;
}

async function fetchPullRequests(
  filters: IFilter[]
): Promise<IPullRequestGroup[]> {
  return Promise.all(
    filters.map(
      async (filter: IFilter): Promise<IPullRequestGroup> => {
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
      }
    )
  );
}

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
      <PullRequestToolbar onRefresh={refreshPullRequests} />
      {isLoading ? (
        <BeatLoader
          sizeUnit={'px'}
          size={5}
          color={'var(--jp-ui-font-color1)'}
          loading={isLoading}
        />
      ) : (
        <PullRequestBrowser
          docRegistry={props.docRegistry}
          commands={props.commands}
          prGroups={pullRequests}
        />
      )}
    </div>
  );
}
