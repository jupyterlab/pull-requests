import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Panel, Widget } from '@lumino/widgets';
import { NotebookDiffModel } from 'nbdime/lib/diff/model';
import {
  CellDiffWidget,
  MetadataDiffWidget,
  NotebookDiffWidget
} from 'nbdime/lib/diff/widget';
import {
  ADDED_CHUNK_PANEL_CLASS,
  CHUNK_PANEL_CLASS,
  REMOVED_CHUNK_PANEL_CLASS,
  UNCHANGED_DIFF_CLASS
} from 'nbdime/lib/diff/widget/common';
import { IComment, IThread, IThreadCell } from '../../tokens';
import { generateNode } from '../../utils';
import { Discussion } from '../discussion/Discussion';

export interface INotebookCellsDiffProps {
  /**
   * Discussions grouped by cell
   */
  comments: IThreadCell[];
  /**
   * Notebook filename
   */
  filename: string;
  /**
   * Notebook diff model
   */
  model: NotebookDiffModel;
  /**
   * Rendermime registry
   */
  renderMime: IRenderMimeRegistry;
  /**
   * Pull request Id
   */
  pullRequestId: string;
}

/**
 * NotebookCellDiff widget
 */
export class NotebookCellsDiff extends NotebookDiffWidget {
  constructor(props: INotebookCellsDiffProps) {
    super(props.model, props.renderMime);
    this._filename = props.filename;
    this._pullRequestId = props.pullRequestId;
    this.__renderMime = props.renderMime;
    this._threads = props.comments;
  }

  /**
   * Add a new discussion
   *
   * @param chunkIndex Cell chunk index
   * @param widget Panel containing the discussion
   * @param lineNo Line of the cell chunk
   * @param side Side of the line selected
   */
  addDiscussion(
    chunkIndex: number,
    widget: Panel,
    lineNo: number,
    side: 'line' | 'originalLine'
  ): void {
    const threadsForChunk = this._threads[chunkIndex].threads;
    const hasNewThread =
      threadsForChunk[threadsForChunk.length - 1]?.comments.length === 0;
    if (!hasNewThread) {
      const thread: IThread = {
        comments: new Array<IComment>(),
        pullRequestId: this._pullRequestId,
        filename: this._filename
      };
      thread[side] = lineNo + 1;
      threadsForChunk.push(thread);
      widget.addWidget(this.makeThreadWidget(thread, threadsForChunk));
    }
  }

  /**
   * Add widget to the panel
   *
   * If the widget is a cell diff, we add comments widget.
   *
   * @param widget Widget
   */
  addWidget(widget: Widget): void {
    if (widget.hasClass(CHUNK_PANEL_CLASS)) {
      const panel = widget as Panel;
      if (
        (panel.widgets[0] as Panel).widgets.length === 0 &&
        (panel.widgets[1] as Panel).widgets.length > 1
      ) {
        [...(panel.widgets[1] as Panel).widgets].forEach(widget_ => {
          const chunkPanel = new Panel();
          chunkPanel.addClass(CHUNK_PANEL_CLASS);
          const addedPanel = new Panel();
          addedPanel.addClass(ADDED_CHUNK_PANEL_CLASS);
          const removedPanel = new Panel();
          removedPanel.addClass(REMOVED_CHUNK_PANEL_CLASS);
          removedPanel.addWidget(widget_);
          chunkPanel.addWidget(addedPanel);
          chunkPanel.addWidget(removedPanel);
          this.addWidget(chunkPanel);

          (panel.widgets[1] as Panel).layout.removeWidget(widget_);
        });
        panel.dispose();
        return;
      } else if (
        (panel.widgets[1] as Panel).widgets.length === 0 &&
        (panel.widgets[0] as Panel).widgets.length > 1
      ) {
        [...(panel.widgets[0] as Panel).widgets].forEach(widget_ => {
          const chunkPanel = new Panel();
          chunkPanel.addClass(CHUNK_PANEL_CLASS);
          const addedPanel = new Panel();
          addedPanel.addClass(ADDED_CHUNK_PANEL_CLASS);
          const removedPanel = new Panel();
          removedPanel.addClass(REMOVED_CHUNK_PANEL_CLASS);
          addedPanel.addWidget(widget_);
          chunkPanel.addWidget(addedPanel);
          chunkPanel.addWidget(removedPanel);
          this.addWidget(chunkPanel);

          (panel.widgets[0] as Panel).layout.removeWidget(widget_);
        });
        panel.dispose();
        return;
      }
    }

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

      const commentButton = generateNode('div', {
        class: 'jp-PullRequestCellDiffCommentContainer'
      });

      const cellDiff = new Panel();
      cellDiff.addClass('jp-PullRequestCellDiffContent');
      cellDiff.addWidget(widget);
      cellDiff.addWidget(new Widget({ node: commentButton }));

      const chunkWidget = new Panel();
      chunkWidget.addClass('jp-PullRequestCellDiff');

      // Determine if the cell has changes
      if (widget.node.classList.contains(`${UNCHANGED_DIFF_CLASS}`)) {
        chunkWidget.addClass('jp-git-unchanged');
        chunkWidget.node.addEventListener('click', (event: MouseEvent) => {
          if (chunkWidget.hasClass('jp-git-unchanged')) {
            chunkWidget.removeClass('jp-git-unchanged');
            chunkWidget.node.title = '';
          }
        });
        chunkWidget.node.title = 'Click to display unchanged cell.';
      }

      chunkWidget.addWidget(cellDiff);

      const currentThreads = this._threads[currentPosition].threads;
      currentThreads.forEach((thread, _, array) => {
        chunkWidget.addWidget(this.makeThreadWidget(thread, array));
      });

      if (currentThreads.length > 0) {
        chunkWidget.node.setAttribute(
          'data-pullrequest-hasthread',
          currentThreads.length.toString()
        );
      }

      const line = this._threads[currentPosition].range?.end;
      const originalLine = this._threads[currentPosition].originalRange?.end;

      commentButton
        .appendChild(
          generateNode(
            'div',
            { class: 'jp-PullRequestCellDiffComment' },
            null,
            {
              click: () =>
                this.addDiscussion(
                  currentPosition,
                  chunkWidget,
                  line || originalLine || 0,
                  line ? 'line' : 'originalLine'
                )
            }
          )
        )
        .appendChild(
          generateNode('div', { class: 'jp-PullRequestCommentDecoration' })
        );

      widget = chunkWidget;
    }
    super.addWidget(widget);
  }

  private makeThreadWidget(thread: IThread, threads: IThread[]): Widget {
    const widget = new Discussion({
      renderMime: this.__renderMime,
      thread,
      handleRemove: (): void => {
        const threadIndex = threads.findIndex(
          thread_ => thread.id === thread_.id
        );
        threads.splice(threadIndex, 1);
        widget.parent = null;
        widget.dispose();
      }
    });

    return widget;
  }

  protected _filename: string;
  protected _pullRequestId: string;
  protected __renderMime: IRenderMimeRegistry;
  protected _threads: IThreadCell[];
  // Current chunk position
  private _chunkIndex = 0;
}
