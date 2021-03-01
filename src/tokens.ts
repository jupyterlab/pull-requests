import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

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

export interface IFile {
  fileType: DocumentRegistry.IFileType;
  name: string;
  status: string;
}

export interface IFileContent {
  baseContent: string;
  headContent: string;
}

export interface IComment {
  id: number | string;
  text: string;
  updatedAt: string;
  userName: string;
  userPicture?: string;
}

export interface ICommentReply {
  text: string;
  in_reply_to: string | number;
}

export interface INewComment {
  text: string;
  filename: string;
  position: number;
  comment_id: string | number;
}

export interface IThread {
  comments: IComment[];
  filename?: string;
  id?: string | number;
  line?: number;
  originalLine?: number;
  pullRequestId: string;
}

export interface IThreadCell {
  originalRange?: IRange;
  range?: IRange;
  threads: IThread[];
}

export interface IPullRequest {
  id: string;
  title: string;
  body: string;
  link: string;
  internalId: string;
}

export interface IPullRequestGroup {
  name: string;
  pullRequests: IPullRequest[];
  error?: string;
}

export interface IRange {
  start: number;
  end: number;
}

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

export interface IDiffOptions {
  prId: string;
  filename: string;
  content: IFileContent;
  threads: IThread[];

  /**
   * A rendermime instance to use to render markdown/outputs.
   */
  renderMime: IRenderMimeRegistry;

  /**
   * Whether to hide unchanged code by default.
   */
  hideUnchanged?: boolean;
}
