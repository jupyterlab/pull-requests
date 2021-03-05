/**
 * Modified from nbdime
 * https://github.com/jupyter/nbdime/blob/master/packages/labextension/src/widget.ts
 */

/* eslint-disable no-inner-declarations */

import { INotebookContent } from '@jupyterlab/nbformat';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ServerConnection } from '@jupyterlab/services';
import { JSONObject } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { Panel, Widget } from '@lumino/widgets';
import jsonMap from 'json-source-map';
import { IDiffEntry } from 'nbdime/lib/diff/diffentries';
import { CellDiffModel, NotebookDiffModel } from 'nbdime/lib/diff/model';
import {
  IDiffOptions,
  INotebookMapping,
  IThread,
  IThreadCell
} from '../../tokens';
import { generateNode, requestAPI } from '../../utils';
import { NotebookCellsDiff } from './NotebookCellsDiff';

/**
 * Class of the outermost widget, the draggable tab
 */
const NBDIME_CLASS = 'nbdime-Widget';

/**
 * Class of the root of the actual diff, the scroller element
 */
const ROOT_CLASS = 'nbdime-root';

export class NotebookDiff extends Panel {
  constructor(props: IDiffOptions) {
    super();
    this.addClass(NBDIME_CLASS);
    this.scroller = new Panel();
    this.scroller.addClass(ROOT_CLASS);
    this.scroller.node.tabIndex = -1;

    const header = Private.diffHeader(
      props.diff.base.label,
      props.diff.head.label
    );
    this.scroller.addWidget(header);

    this.addWidget(this.scroller);

    this.computeDiff(props.diff.base.content, props.diff.head.content)
      .then(data => {
        this.onData(
          props.pullRequestId,
          props.filename,
          data,
          props.renderMime,
          props.threads
        );
      })
      .catch(error => {
        this.onError(error);
      });
  }

  protected async computeDiff(
    previousContent: string,
    currentContent: string
  ): Promise<JSONObject> {
    const data = await requestAPI<JSONObject>(
      'pullrequests/files/nbdiff',
      'POST',
      {
        previousContent,
        currentContent
      }
    );
    data['baseMapping'] = Private.computeNotebookMapping(
      previousContent || '{}'
    ) as any;
    data['headMapping'] = Private.computeNotebookMapping(
      currentContent || '{}'
    ) as any;
    return data;
  }

  dispose(): void {
    this.scroller.dispose();
    super.dispose();
  }

  protected static mapThreadsOnChunks(
    baseMapping: INotebookMapping,
    headMapping: INotebookMapping,
    chunks: CellDiffModel[][],
    threads: IThread[]
  ): IThreadCell[] {
    // Last element will be for the notebook metadata
    const threadsByChunk = new Array<IThreadCell>(chunks.length + 1);
    for (let index = 0; index < threadsByChunk.length; index++) {
      threadsByChunk[index] = {
        threads: new Array<IThread>()
      };
    }

    // Sort thread by line and originalLine order
    const sortedThreads = [...threads].sort((a: IThread, b: IThread) => {
      if (a.line !== null && b.line !== null) {
        return a.line - b.line;
      }
      if (a.originalLine !== null && b.originalLine !== null) {
        return a.originalLine - b.originalLine;
      }
      return 0;
    });

    let lastBaseCell = -1;
    let lastHeadCell = -1;
    let lastThread = -1;
    // Handle thread set before the cells
    let thread: IThread;
    do {
      lastThread += 1;
      thread = sortedThreads[lastThread];
    } while (
      lastThread < sortedThreads.length &&
      thread.line < headMapping.cells[0].start &&
      thread.originalLine < baseMapping.cells[0].start
    );

    if (lastThread > 0) {
      // There are thread before the cells
      // They will be added on the metadata diff
      threadsByChunk[threadsByChunk.length - 1].threads = sortedThreads.splice(
        0,
        lastThread
      );
    }

    // Handle threads on cells
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      for (const cellDiff of chunk) {
        let inThisBaseChunk = true;
        let inThisHeadChunk = true;
        let currentThread = 0;
        if (cellDiff.source.base !== null) {
          lastBaseCell += 1;
          threadsByChunk[chunkIndex].originalRange =
            baseMapping.cells[lastBaseCell];
        }
        if (cellDiff.source.remote !== null) {
          lastHeadCell += 1;
          threadsByChunk[chunkIndex].range = headMapping.cells[lastHeadCell];
        }
        while (
          (inThisBaseChunk || inThisHeadChunk) &&
          currentThread < sortedThreads.length
        ) {
          const thread = sortedThreads[currentThread];
          if (cellDiff.source.base !== null) {
            const baseRange = threadsByChunk[chunkIndex].originalRange;
            if (
              baseRange?.start <= thread.originalLine - 1 &&
              thread.originalLine - 1 <= baseRange?.end
            ) {
              threadsByChunk[chunkIndex].threads.push(
                ...sortedThreads.splice(currentThread, 1)
              );
              continue;
            } else {
              inThisBaseChunk = false;
            }
          }
          if (cellDiff.source.remote !== null) {
            const headRange = threadsByChunk[chunkIndex].range;
            if (
              headRange?.start <= thread.line - 1 &&
              thread.line - 1 <= headRange?.end
            ) {
              threadsByChunk[chunkIndex].threads.push(
                ...sortedThreads.splice(currentThread, 1)
              );
              continue;
            } else {
              inThisHeadChunk = false;
            }
          }
          currentThread++;
        }
      }
    }

    // Handle remaining threads
    if (lastThread < sortedThreads.length) {
      // There are thread after the cells
      // They will be added on the metadata diff
      threadsByChunk[threadsByChunk.length - 1].threads.push(
        ...sortedThreads.slice(lastThread, sortedThreads.length)
      );
    }
    threadsByChunk[threadsByChunk.length - 1].range = headMapping.metadata;
    threadsByChunk[threadsByChunk.length - 1].originalRange =
      baseMapping.metadata;

    return threadsByChunk;
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.scroller.node.focus();
  }

  /**
   * Callback on diff and discussions requests
   *
   * @param pullRequestId Pull request ID
   * @param filename Notebook filename
   * @param data Notebook diff raw data
   * @param renderMime Rendermime registry
   * @param threads List of discussion on the file
   */
  protected onData(
    pullRequestId: string,
    filename: string,
    data: JSONObject,
    renderMime: IRenderMimeRegistry,
    threads: IThread[]
  ): void {
    if (this.isDisposed) {
      return;
    }
    const base = data['base'] as INotebookContent;
    const diff = (data['diff'] as any) as IDiffEntry[];
    const model = new NotebookDiffModel(base, diff);
    const comments = NotebookDiff.mapThreadsOnChunks(
      data.baseMapping as any,
      data.headMapping as any,
      NotebookDiff.reChunkCells(model.chunkedCells),
      threads
    );
    const nbdWidget = new NotebookCellsDiff({
      pullRequestId,
      filename,
      model,
      comments,
      renderMime
    });

    this.scroller.addWidget(nbdWidget);
    nbdWidget.init().catch(error => {
      console.error('Failed to mark unchanged ranges', error);
    });
  }

  /**
   * Callback on error when requesting the diff or the discussions
   *
   * @param error Error
   */
  protected onError(
    error: ServerConnection.NetworkError | ServerConnection.ResponseError
  ): void {
    if (this.isDisposed) {
      return;
    }
    console.error(error);
    const widget = new Widget();
    widget.node.innerHTML = `<h2 class="jp-PullRequestTabError">
    <span style="color: 'var(--jp-ui-font-color1)';">
      Error Loading File:
    </span> ${error.message}</h2>`;
    this.scroller.addWidget(widget);
  }

  /**
   * Change cell grouping to allow commenting on each cell
   *
   * @param chunks Cell chunks from nbdime
   * @returns New chunks
   */
  protected static reChunkCells(chunks: CellDiffModel[][]): CellDiffModel[][] {
    const newChunks: CellDiffModel[][] = [];
    for (const chunk of chunks) {
      // If chunk is unmodified, push it to stack
      if (chunk.length === 1 && !(chunk[0].added || chunk[0].deleted)) {
        newChunks.push([chunk[0]]);
      } else {
        let modifiedPair: Array<CellDiffModel | null> = [null, null];
        for (const cell of chunk) {
          if (cell.deleted) {
            // if 'removed' not in chunk, add to chunk
            if (modifiedPair[0] === null) {
              modifiedPair[0] = cell;
            }
            // if 'removed' already in chunk, push chunk to chunks and start new chunk
            else {
              newChunks.push(modifiedPair.filter(item => item !== null));
              modifiedPair = [cell, null];
            }
          } else {
            // if 'added' not in chunk, add to chunk
            if (modifiedPair[1] === null) {
              modifiedPair[1] = cell;
            }
            // if 'added' already in chunk, push chunk to chunks and start new chunk
            else {
              newChunks.push(modifiedPair.filter(item => item !== null));
              modifiedPair = [null, cell];
            }
          }
        }
        // if nonempty at end, push the remaining pair
        if (modifiedPair[0] !== null || modifiedPair[1] !== null) {
          newChunks.push(modifiedPair.filter(item => item !== null));
        }
      }
    }
    return newChunks;
  }

  protected scroller: Panel;
}

namespace Private {
  /**
   * Map cell index with their position in the JSON file
   *
   * @param content Notebook file content
   */
  export function computeNotebookMapping(content: string): INotebookMapping {
    const parsedContent = jsonMap.parse(content) as {
      data: any;
      pointers: any;
    };

    return {
      metadata: {
        start: parsedContent.pointers['/metadata']?.key.line,
        end: parsedContent.pointers['/metadata']?.valueEnd.line
      },
      cells: (parsedContent.data.cells || []).map(
        (cell: any, index: number) => {
          return {
            start: parsedContent.pointers[`/cells/${index}`].value.line,
            end: parsedContent.pointers[`/cells/${index}`].valueEnd.line
          };
        }
      )
    };
  }
  /**
   * Create a header widget for the diff view.
   */
  export function diffHeader(baseLabel: string, remoteLabel: string): Widget {
    const node = generateNode('div', { class: 'jp-git-diff-banner' });

    node.innerHTML = `<span>${baseLabel}</span>
        <span>${remoteLabel}</span>`;

    return new Widget({ node });
  }
}
