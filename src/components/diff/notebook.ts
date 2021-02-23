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
import { IDiffEntry } from 'nbdime/lib/diff/diffentries';
import { NotebookDiffModel } from 'nbdime/lib/diff/model';
import { CELLDIFF_CLASS, NotebookDiffWidget } from 'nbdime/lib/diff/widget';
import {
  CHUNK_PANEL_CLASS,
  UNCHANGED_DIFF_CLASS
} from 'nbdime/lib/diff/widget/common';
import { IDiffOptions } from '../../tokens';
import { requestAPI } from '../../utils';

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

    const header = Private.diffHeader(props);
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

    this.computeDiff(props.content.baseContent, props.content.headContent)
      .then(
        // model => {
        //   this._diffWidget = new NotebookDiffWidget(model, props.renderMime);
        //   this.node.append(this._diffWidget.node);
        //   this._diffWidget.init();
        // }
        data => {
          this.onData(data, props.renderMime);
        }
      )
      .catch(error => {
        this.onError(error);
      });
  }

  protected async computeDiff(
    baseContent: string,
    headContent: string
  ): Promise<JSONObject> {
    return requestAPI<JSONObject>('pullrequests/files/nbdiff', 'POST', {
      previousContent: baseContent,
      currentContent: headContent
    });
  }

  dispose(): void {
    this.scroller.dispose();
    super.dispose();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.scroller.node.focus();
  }

  protected onData(data: JSONObject, renderMime: IRenderMimeRegistry): void {
    if (this.isDisposed) {
      return;
    }
    const base = data['base'] as INotebookContent;
    const diff = (data['diff'] as any) as IDiffEntry[];
    const nbdModel = new NotebookDiffModel(base, diff);
    const nbdWidget = new NotebookDiffWidget(nbdModel, renderMime);

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
    const widget = new Widget();
    widget.node.innerHTML = `Failed to fetch diff: ${error.message}`;
    this.scroller.addWidget(widget);
  }

  protected scroller: Panel;
}

namespace Private {
  /**
   * Create a header widget for the diff view.
   */
  export function diffHeader(options: IDiffOptions): Widget {
    // FIXME
    const baseLabel = '';
    const remoteLabel = '';

    const node = document.createElement('div');
    node.className = 'nbdime-Diff';
    node.innerHTML = `
      <div class="nbdime-header-buttonrow">
        <label><input class="nbdime-hide-unchanged" type="checkbox">Hide unchanged cells</label>
        <button class="nbdime-export" style="display: none">Export diff</button>
      </div>
      <div class=nbdime-header-banner>
        <span class="nbdime-header-base">${baseLabel}</span>
        <span class="nbdime-header-remote">${remoteLabel}</span>
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
