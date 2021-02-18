import { FilePath } from '@jupyterlab/git/lib/components/FilePath';
import * as React from 'react';
import { PullRequestFileModel } from '../../models';

export interface IPullRequestBrowserFileItemProps {
  file: PullRequestFileModel;
}

export function PullRequestBrowserFileItem(
  props: IPullRequestBrowserFileItemProps
): JSX.Element {
  return (
    <div className="jp-PullRequestBrowserFileItem" title={props.file.name}>
      <FilePath filepath={props.file.name} filetype={props.file.fileType} />
      <span className="jp-PullRequestBrowserFileItemChanged">
        {props.file.status}
      </span>
    </div>
  );
}
