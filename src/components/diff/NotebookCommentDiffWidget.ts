import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Widget } from '@lumino/widgets';
import { NotebookDiffModel } from 'nbdime/lib/diff/model';
import {
  CellDiffWidget,
  MetadataDiffWidget,
  // MetadataDiffWidget,
  NotebookDiffWidget
} from 'nbdime/lib/diff/widget';
import { CHUNK_PANEL_CLASS } from 'nbdime/lib/diff/widget/common';
import { IThread } from '../../tokens';
import { generateNode } from '../../utils';
import { CommentThread } from './CommentThread';

export class NotebookCommentDiffWidget extends NotebookDiffWidget {
  constructor(
    model: NotebookDiffModel,
    comments: IThread[][],
    rendermime: IRenderMimeRegistry
  ) {
    super(model, rendermime);
    this.__renderMime = rendermime;
    this._threads = comments;
  }

  addComment(index?: number): void {
    // for (const comment of this.state.prChunks[i].comments) {
    //   if (isNull(comment.comment)) {
    //     return;
    //   }
    // }
    // const commentToAdd: PullRequestCommentThreadModel = new PullRequestCommentThreadModel(
    //   '',
    //   this.props.file.name,
    //   this.props.file.commitId,
    //   this.state.prChunks[i].lineNumber.lineNumberStart
    // );
    // const prChunks = [...this.state.prChunks];
    // const prChunk = { ...prChunks[i] };
    // prChunk.comments = [...prChunk.comments, commentToAdd];
    // prChunks[i] = prChunk;
    // this.setState({ prChunks: prChunks });
  }

  /**
   * Add widget to the panel
   *
   * If the widget is a cell diff, we add comments widget.
   *
   * @param widget Widget
   */
  addWidget(widget: Widget): void {
    if (
      widget instanceof CellDiffWidget ||
      widget.hasClass(CHUNK_PANEL_CLASS) ||
      widget instanceof MetadataDiffWidget
    ) {
      let currentPosition = this._chunkIndex;
      if (widget instanceof MetadataDiffWidget) {
        currentPosition = this._threads.length - 1;
      } else {
        this._chunkIndex += 1;
      }

      const cellDiff = generateNode('div', { class: 'jp-PullRequestCellDiff' });
      const head = generateNode('div', { class: 'jp-PullRequestNBDiff' });
      head
        .appendChild(cellDiff)
        .appendChild(
          generateNode('div', { class: 'jp-PullRequestCellDiffContent' })
        )
        .appendChild(widget.node);
      cellDiff
        .appendChild(
          generateNode('div', {
            class: 'jp-PullRequestCellDiffCommentContainer'
          })
        )
        .appendChild(
          generateNode(
            'div',
            { class: 'jp-PullRequestCellDiffComment' },
            null,
            {
              click: () => this.addComment(currentPosition)
            }
          )
        )
        .appendChild(
          generateNode('div', { class: 'jp-PullRequestCommentDecoration' })
        );

      this._threads[currentPosition]?.forEach(thread => {
        head.appendChild(
          new CommentThread({
            renderMime: this.__renderMime,
            thread,
            handleRemove: () => null
          }).node
        );
      });

      widget = new Widget({
        node: head as any
      });
    }
    super.addWidget(widget);
  }

  protected _threads: IThread[][];
  // Current chunk position
  private _chunkIndex = 0;
  protected __renderMime: IRenderMimeRegistry;
}
