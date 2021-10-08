/**
 * Modified from nbdime
 * https://github.com/jupyter/nbdime/blob/master/packages/labextension/src/widget.ts
 */

/* eslint-disable no-inner-declarations */

import { NotebookDiff } from '@jupyterlab/git';
import { DiffModel } from '@jupyterlab/git/lib/components/diff/model';
import { INotebookContent } from '@jupyterlab/nbformat';
import jsonMap from 'json-source-map';
import { IDiffEntry } from 'nbdime/lib/diff/diffentries';
import { CellDiffModel, NotebookDiffModel } from 'nbdime/lib/diff/model';
import { NotebookDiffWidget } from 'nbdime/lib/diff/widget';
import {
  IDiffOptions,
  INotebookMapping,
  IThread,
  IThreadCell
} from '../../tokens';
import { requestAPI } from '../../utils';
import { NotebookCellsDiff } from './NotebookCellsDiff';

/**
 * Data return by the ndbime api endpoint
 */
interface INbdimeDiff {
  /**
   * Base notebook content
   */
  base: INotebookContent;
  /**
   * Diff to obtain challenger from base
   */
  diff: IDiffEntry[];
}

export class NotebookPRDiff extends NotebookDiff {
  constructor(props: IDiffOptions) {
    super(
      new DiffModel({
        challenger: {
          content: (): Promise<string> =>
            Promise.resolve(props.diff.head.content),
          label: props.diff.head.label,
          source: props.diff.head.sha
        },
        filename: props.filename,
        reference: {
          content: (): Promise<string> =>
            Promise.resolve(props.diff.base.content),
          label: props.diff.base.label,
          source: props.diff.base.sha
        }
      }),
      props.renderMime
    );
    this._props = props;
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

  protected async createDiffView(
    challengerContent: string,
    referenceContent: string
  ): Promise<NotebookDiffWidget> {
    const data = await requestAPI<INbdimeDiff>('git/diffnotebook', 'POST', {
      currentContent: challengerContent,
      previousContent: referenceContent
    });

    const model = new NotebookDiffModel(data.base, data.diff);

    const baseMapping = Private.computeNotebookMapping(
      referenceContent || '{}'
    );
    const headMapping = Private.computeNotebookMapping(
      challengerContent || '{}'
    );
    const comments = NotebookPRDiff.mapThreadsOnChunks(
      baseMapping,
      headMapping,
      NotebookPRDiff.reChunkCells(model.chunkedCells),
      this._props.threads
    );

    return new NotebookCellsDiff({
      pullRequestId: this._props.pullRequestId,
      filename: this._props.filename,
      model,
      comments,
      renderMime: this._props.renderMime
    });
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

  protected _props: IDiffOptions;
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
}
