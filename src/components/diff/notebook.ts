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
import { CELLDIFF_CLASS } from 'nbdime/lib/diff/widget';
import {
  CHUNK_PANEL_CLASS,
  UNCHANGED_DIFF_CLASS
} from 'nbdime/lib/diff/widget/common';
import {
  IDiffOptions,
  INotebookMapping,
  IThread,
  IThreadCell
} from '../../tokens';
import { generateNode, requestAPI } from '../../utils';
import { NotebookCommentDiffWidget } from './NotebookCommentDiffWidget';

/**
 * Class of the outermost widget, the draggable tab
 */
const NBDIME_CLASS = 'nbdime-Widget';

/**
 * Class of the root of the actual diff, the scroller element
 */
const ROOT_CLASS = 'nbdime-root';

/**
 * DOM class for whether or not to hide unchanged cells
 */
const HIDE_UNCHANGED_CLASS = 'jp-mod-hideUnchanged';

export class NotebookDiff extends Panel {
  constructor(props: IDiffOptions) {
    super();
    this.addClass(NBDIME_CLASS);

    const header = Private.diffHeader(
      props.diff.base.label,
      props.diff.head.label
    );
    this.addWidget(header);

    this.scroller = new Panel();
    this.scroller.addClass(ROOT_CLASS);
    this.scroller.node.tabIndex = -1;
    this.addWidget(this.scroller);

    const hideUnchangedChk = header.node.getElementsByClassName(
      'nbdime-hide-unchanged'
    )[0] as HTMLInputElement;
    hideUnchangedChk.checked =
      props.hideUnchanged === undefined ? true : props.hideUnchanged;
    hideUnchangedChk.onchange = (): void => {
      Private.toggleShowUnchanged(this.scroller, !hideUnchangedChk.checked);
    };
    if (props.hideUnchanged) {
      Private.toggleShowUnchanged(this.scroller, false);
    }

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
        }
        if (cellDiff.source.remote !== null) {
          lastHeadCell += 1;
        }
        while (
          (inThisBaseChunk || inThisHeadChunk) &&
          currentThread < sortedThreads.length
        ) {
          const thread = sortedThreads[currentThread];
          if (cellDiff.source.base !== null) {
            const baseRange = baseMapping.cells[lastBaseCell];
            threadsByChunk[chunkIndex].originalRange = baseRange;
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
            const headRange = headMapping.cells[lastHeadCell];
            threadsByChunk[chunkIndex].range = headRange;
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

  protected onData(
    prId: string,
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
    const nbdModel = new NotebookDiffModel(base, diff);
    const groupedComments = NotebookDiff.mapThreadsOnChunks(
      data.baseMapping as any,
      data.headMapping as any,
      nbdModel.chunkedCells,
      threads
    );
    const nbdWidget = new NotebookCommentDiffWidget(
      prId,
      filename,
      nbdModel,
      groupedComments,
      renderMime
    );

    this.scroller.addWidget(nbdWidget);
    const work = nbdWidget.init();
    work
      .then(() => {
        Private.markUnchangedRanges(this.scroller.node);
      })
      .catch(error => {
        console.error('Failed to mark unchanged ranges', error);
      });
  }

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

  protected scroller: Panel;
}

namespace Private {
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
    const node = generateNode('div', { class: 'nbdime-Diff jp-git-diff-root' });

    node.innerHTML = `
      <div class="nbdime-header-buttonrow">
        <label><input class="nbdime-hide-unchanged" type="checkbox">Hide unchanged cells</label>
        <button class="nbdime-export" style="display: none">Export diff</button>
      </div>
      <div class=jp-git-diff-banner>
        <span>${baseLabel}</span>
        <span>${remoteLabel}</span>
      </div>`;

    return new Widget({ node });
  }

  /**
   * Toggle whether to show or hide unchanged cells.
   *
   * This simply marks with a class, real work is done by CSS.
   */
  export function toggleShowUnchanged(root: Widget, show?: boolean): void {
    const hiding = root.hasClass(HIDE_UNCHANGED_CLASS);
    if (show === undefined) {
      show = hiding;
    } else if (hiding !== show) {
      // Nothing to do
      return;
    }
    if (show) {
      root.removeClass(HIDE_UNCHANGED_CLASS);
    } else {
      markUnchangedRanges(root.node);
      root.addClass(HIDE_UNCHANGED_CLASS);
    }
    root.update();
  }

  /**
   * Gets the chunk element of an added/removed cell, or the cell element for others
   * @param cellElement
   */
  function getChunkElement(cellElement: Element): Element {
    if (
      !cellElement.parentElement ||
      !cellElement.parentElement.parentElement
    ) {
      return cellElement;
    }
    const chunkCandidate = cellElement.parentElement.parentElement;
    if (chunkCandidate.classList.contains(CHUNK_PANEL_CLASS)) {
      return chunkCandidate;
    }
    return cellElement;
  }

  /**
   * Marks certain cells with
   */
  export function markUnchangedRanges(root: HTMLElement): void {
    const children = root.querySelectorAll(`.${CELLDIFF_CLASS}`);
    let rangeStart = -1;
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      if (!child.classList.contains(UNCHANGED_DIFF_CLASS)) {
        // Visible
        if (rangeStart !== -1) {
          // Previous was hidden
          const N = i - rangeStart;
          getChunkElement(child).setAttribute(
            'data-nbdime-NCellsHiddenBefore',
            N.toString()
          );
          rangeStart = -1;
        }
      } else if (rangeStart === -1) {
        rangeStart = i;
      }
    }
    if (rangeStart !== -1) {
      // Last element was part of a hidden range, need to mark
      // the last cell that will be visible.
      const N = children.length - rangeStart;
      if (rangeStart === 0) {
        // All elements were hidden, nothing to mark
        // Add info on root instead
        const tag = root.querySelector('.jp-Notebook-diff') || root;
        tag.setAttribute('data-nbdime-AllCellsHidden', N.toString());
        return;
      }
      const lastVisible = children[rangeStart - 1];
      getChunkElement(lastVisible).setAttribute(
        'data-nbdime-NCellsHiddenAfter',
        N.toString()
      );
    }
  }
}
