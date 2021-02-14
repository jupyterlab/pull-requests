import {
  deletionsMadeIcon,
  insertionsMadeIcon
} from '@jupyterlab/git/lib/style/icons';
import * as React from 'react';
import { PullRequestFileModel } from '../../models';

export interface IPullRequestBrowserFileItemProps {
  file: PullRequestFileModel;
}

/** Get the extension of a given file */
function getExtensionIcon(ext: string): string {
  switch (ext) {
    case '.ipynb':
      return 'jp-NotebookIcon';
    case '.md':
      return 'jp-MarkdownIcon';
    case '.py':
      return 'jp-PythonIcon';
    case '.json':
      return 'jp-JSONIcon';
    case '.csv':
      return 'jp-SpreadsheetIcon';
    case '.xls':
      return 'jp-FileIcon';
    case '.r':
      return 'jp-RKernelIcon';
    case '.yml':
      return 'jp-YamlIcon';
    case '.yaml':
      return 'jp-YamlIcon';
    case '.svg':
      return 'jp-ImageIcon';
    case '.tiff':
      return 'jp-ImageIcon';
    case '.jpeg':
      return 'jp-ImageIcon';
    case '.jpg':
      return 'jp-ImageIcon';
    case '.gif':
      return 'jp-ImageIcon';
    case '.png':
      return 'jp-ImageIcon';
    case '.raw':
      return 'jp-ImageIcon';
    default:
      return 'jp-FileIcon';
  }
}

/** Get the filename from a path */
function extractFilename(path: string): string {
  if (path[path.length - 1] === '/') {
    return path;
  } else {
    const temp = path.split('/');
    return temp[temp.length - 1];
  }
}

export function PullRequestBrowserFileItem(
  props: IPullRequestBrowserFileItemProps
): JSX.Element {
  return (
    <div className="jp-PullRequestBrowserFileItem" title={props.file.name}>
      <span
        className={
          'jp-Icon jp-Icon-16 jp-PullRequestBrowserFileItemIcon ' +
          getExtensionIcon(props.file.extension)
        }
      ></span>
      <span className="jp-PullRequestBrowserFileItemName">
        {extractFilename(props.file.name)}
      </span>
      <span className="jp-PullRequestBrowserFileItemChanged">
        {props.file.status}
      </span>
      <div className="jp-PullRequestBrowserFileItemDiff">
        <span className="jp-PullRequestBrowserFileItemDiffText">
          {props.file.additions}
        </span>
        <insertionsMadeIcon.react tag="span" />
        <span className="jp-PullRequestBrowserFileItemDiffText">
          {props.file.deletions}
        </span>
        <deletionsMadeIcon.react tag="span" />
      </div>
    </div>
  );
}
