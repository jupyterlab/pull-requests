import { FilePath } from '@jupyterlab/git/lib/components/FilePath';
import * as React from 'react';
import { IFile } from '../../tokens';

/**
 * FileItem properties
 */
export interface IFileItemProps {
  /**
   * File description
   */
  file: IFile;
}

/**
 * FileItem component
 *
 * @param props Component properties
 */
export function FileItem(props: IFileItemProps): JSX.Element {
  return (
    <div className="jp-PullRequestBrowserFileItem" title={props.file.name}>
      <FilePath filepath={props.file.name} filetype={props.file.fileType} />
      <span className="jp-PullRequestBrowserFileItemChanged">
        {props.file.status}
      </span>
    </div>
  );
}
