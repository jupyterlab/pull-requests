import * as React from 'react';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { PullRequestFileModel, PullRequestModel } from '../../models';
import { PullRequestBrowserItem } from './PullRequestBrowserItem';

export interface IPullRequestBrowserProps {
  docRegistry: DocumentRegistry;
  showTab: (data: PullRequestFileModel | PullRequestModel) => Promise<void>;
}

export function PullRequestBrowser(
  props: IPullRequestBrowserProps
): JSX.Element {
  return (
    <div className="jp-PullRequestBrowser">
      <ul>
        <PullRequestBrowserItem
          docRegistry={props.docRegistry}
          showTab={props.showTab}
          header={'Created by Me'}
          filter={'created'}
        />
        <PullRequestBrowserItem
          docRegistry={props.docRegistry}
          showTab={props.showTab}
          header={'Assigned to Me'}
          filter={'assigned'}
        />
      </ul>
    </div>
  );
}
