import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

export const NAMESPACE = 'pullrequests';
export const PLUGIN_ID = '@jupyterlab/pullrequests';

/**
 * @jupyterlab/pullrequests Command IDs
 */
export namespace CommandIDs {
  /**
   * Open Pull Request Description
   */
  export const prOpenDescription = `${NAMESPACE}:open-description`;
  /**
   * Open Pull Request File Diff
   */
  export const prOpenDiff = `${NAMESPACE}:open-diff`;
}

/**
 * Changed file
 */
export interface IFile {
  /**
   * File type
   */
  fileType: DocumentRegistry.IFileType;
  /**
   * File name
   */
  name: string;
  /**
   * File status (added, removed, modified)
   */
  status: string;
}

/**
 * File content with context
 */
export interface IDiffContent {
  /**
   * Branch label
   */
  label: string;
  /**
   * Commit sha
   */
  sha: string;
  /**
   * File content
   */
  content: string;
}

/**
 * File diff
 */
export interface IFileDiff {
  /**
   * Original file content
   */
  base: IDiffContent;
  /**
   * New file content
   */
  head: IDiffContent;
}

/**
 * Comment
 */
export interface IComment {
  /**
   * Unique identifier
   */
  id: number | string;
  /**
   * Comment body
   */
  text: string;
  /**
   * Time at which the comment was updated
   */
  updatedAt: string;
  /**
   * Comment author
   */
  userName: string;
  /**
   * Author avatar url
   */
  userPicture?: string;
}

/**
 * Discussion
 */
export interface IThread {
  /**
   * List of comments
   */
  comments: IComment[];
  /**
   * Filename targeted by the discussion
   *
   * This is not defined for pull request discussion
   */
  filename?: string;
  /**
   * Unique id of a discussion
   */
  id?: string | number;
  /**
   * Commented line number in the new file version
   *
   * This is not defined for pull request discussion
   */
  line?: number;
  /**
   * Commented line number in the original file version
   *
   * This is not defined for pull request discussion
   */
  originalLine?: number;
  /**
   * Pull request unique identifier
   */
  pullRequestId: string;
  /**
   * Whether the comment accept reply or not
   */
  singleton?: boolean;
}

/**
 * Group of discussion on a notebook cell
 */
export interface IThreadCell {
  /**
   * Range of the cell in the original notebook
   */
  originalRange?: IRange;
  /**
   * Range of the cell in the new notebook
   */
  range?: IRange;
  /**
   * List of discussion
   */
  threads: IThread[];
}

/**
 * Pull request
 */
export interface IPullRequest {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Title
   */
  title: string;
  /**
   * Body
   */
  body: string;
  /**
   * URL to the pull request
   */
  link: string;
  /**
   * Pull request unique identifier for the third party service
   */
  internalId: string;
}

/**
 * Group of pull requests
 */
export interface IPullRequestGroup {
  /**
   * Name of the pull requests group
   */
  name: string;
  /**
   * List of pull requests
   */
  pullRequests: IPullRequest[];
  /**
   * Error occurring when listing the pull requests
   */
  error?: string;
}

/**
 * File range
 */
export interface IRange {
  /**
   * Start line number
   */
  start: number;
  /**
   * End line number
   */
  end: number;
}

/**
 * Notebook JSON mapping
 */
export interface INotebookMapping {
  /**
   * Notebook metadata last line in the notebook file.
   */
  metadata: IRange;
  /**
   * Mapping hashed cell content - last line of the cell in the notebook file.
   */
  cells: IRange[];
}

/**
 * Common interface for diff widget
 */
export interface IDiffOptions {
  /**
   * Unique pull request id
   */
  pullRequestId: string;
  /**
   * Filename
   */
  filename: string;
  /**
   * File diff
   */
  diff: IFileDiff;
  /**
   * Diff discussions
   */
  threads: IThread[];
  /**
   * A rendermime instance to use to render comment bodies.
   */
  renderMime: IRenderMimeRegistry;
  /**
   * JupyterLab settings registry
   */
  settingsRegistry: ISettingRegistry | null;
}
