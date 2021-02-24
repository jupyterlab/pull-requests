import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Widget } from '@lumino/widgets';
import { NotebookDiffModel } from 'nbdime/lib/diff/model';
import {
  CellDiffWidget,
  MetadataDiffWidget,
  NotebookDiffWidget
} from 'nbdime/lib/diff/widget';
import { CHUNK_PANEL_CLASS } from 'nbdime/lib/diff/widget/common';
import { IThread } from '../../tokens';
import { generateNode } from '../../utils';

export class NotebookCommentDiffWidget extends NotebookDiffWidget {
  constructor(
    model: NotebookDiffModel,
    comments: IThread[][],
    rendermime: IRenderMimeRegistry
  ) {
    super(model, rendermime);
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
      const cellDiff = generateNode('div', { class: 'jp-PullRequestCellDiff' });
      const head = generateNode('div', { class: 'jp-PullRequestNBDiff' });
      head
        .appendChild(cellDiff)
        .appendChild(
          generateNode('div', { class: 'jp-PullRequestCellDiffContent' })
        )
        .appendChild(widget.node);

      const currentPosition = this._position;
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

      this._threads[currentPosition]?.forEach(comment => {
        // head.appendChild();
        //     <PullRequestCommentThread
        //       key={i}
        //       thread={comment}
        //       handleRemove={() => this.removeComment(index, comment)}
        //     />
      });

      widget = new Widget({
        node: head as any
      });
    }
    super.addWidget(widget);

    this._position += 1;
  }

  protected _threads: IThread[][];
  // Current chunk position
  private _position = 0;
}

// export class ModifiedChunkPair {
//   constructor(addedCell: CellDiffModel, removedCell: CellDiffModel) {
//     this.addedCell = addedCell;
//     this.removedCell = removedCell;
//   }

//   isEmpty(): boolean {
//     return this.addedCell === null && this.removedCell === null;
//   }

//   toArray(): CellDiffModel[] {
//     const arr: CellDiffModel[] = [];
//     if (this.addedCell !== null) {
//       arr.push(this.addedCell);
//     }
//     if (this.removedCell !== null) {
//       arr.push(this.removedCell);
//     }
//     return arr;
//   }

//   addedCell: CellDiffModel;
//   removedCell: CellDiffModel;
// }

// export interface IPullRequestLineNumber {
//   lineNumberStart: number;
//   lineNumberEnd: number;
// }

// export class PullRequestChunkModel {
//   constructor(
//     chunk: CellDiffModel[],
//     file: PullRequestFileModel,
//     comments: PullRequestCommentThreadModel[] = [],
//     lineNumber?: IPullRequestLineNumber
//   ) {
//     this.chunk = chunk;
//     this.file = file;
//     this.lineNumber = lineNumber;
//     this.comments = comments;
//   }

//   chunk: CellDiffModel[];
//   file: PullRequestFileModel;
//   lineNumber?: IPullRequestLineNumber;
//   comments?: PullRequestCommentThreadModel[];
// }
