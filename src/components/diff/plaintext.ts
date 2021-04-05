/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { PlainTextDiff } from '@jupyterlab/git';
import { DiffModel } from '@jupyterlab/git/lib/components/diff/model';
import { Widget } from '@lumino/widgets';
import { IComment, IDiffOptions, IThread } from '../../tokens';
import { generateNode } from '../../utils';
import { Discussion } from '../discussion/Discussion';

/**
 * Plain Text Diff widget
 */
export class PlainTextPRDiff extends PlainTextDiff {
  constructor(props: IDiffOptions) {
    super(
      new DiffModel<string>({
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
      })
    );
    this._props = props;
  }

  /**
   * Dispose the widget
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    while (this._threadWidgets.length > 0) {
      const widget = this._threadWidgets.pop();
      widget.node.remove();
      widget.dispose();
    }
    super.dispose();
  }

  /**
   * Create comment decoration node
   */
  protected static makeCommentDecoration(): HTMLElement {
    return generateNode('div', { class: 'jp-PullRequestCommentDecoration' });
  }

  /**
   * Add comment gutter on the view port.
   *
   * @param editor CodeMirror editor
   * @param from First line in the view port
   * @param to Last line in the view port
   */
  protected setCommentGutter(
    editor: CodeMirror.Editor,
    from: number,
    to: number,
    side: 'line' | 'originalLine'
  ): void {
    editor.clearGutter('jp-PullRequestCommentDecoration');
    for (let lineIdx = from; lineIdx < to; lineIdx++) {
      const div = PlainTextPRDiff.makeCommentDecoration();
      div.addEventListener('click', () => {
        this.createThread(editor, lineIdx, side);
      });
      editor.setGutterMarker(lineIdx, 'jp-PullRequestCommentDecoration', div);
    }
  }

  /**
   * Create the Plain Text Diff view
   *
   * @param props Plain Text diff options
   */
  protected async createDiffView(): Promise<void> {
    await super.createDiffView();

    if (this._mergeView) {
      {
        this._mergeView.leftOriginal().setOption('gutters', [
          'CodeMirror-linenumbers',
          // FIXME without this - the comment decoration does not show up
          //   But it add a single comment decoration on the first line of each editors
          'jp-PullRequestCommentDecoration',
          'CodeMirror-patchgutter'
        ]);
        const { from, to } = this._mergeView.leftOriginal().getViewport();
        this.updateView(
          this._mergeView.leftOriginal(),
          from,
          to,
          'originalLine'
        );
        this._mergeView
          .leftOriginal()
          .on(
            'viewportChange',
            (editor: CodeMirror.Editor, from: number, to: number) => {
              this.updateView(editor, from, to, 'originalLine');
            }
          );
      }

      {
        this._mergeView.editor().setOption('gutters', [
          'CodeMirror-linenumbers',
          // FIXME without this - the comment decoration does not show up
          //   But it add a single comment decoration on the first line of each editors
          'jp-PullRequestCommentDecoration',
          'CodeMirror-patchgutter'
        ]);
        const { from, to } = this._mergeView.editor().getViewport();
        this.updateView(this._mergeView.editor(), from, to, 'line');
        this._mergeView
          .editor()
          .on(
            'viewportChange',
            (editor: CodeMirror.Editor, from: number, to: number) => {
              this.updateView(editor, from, to, 'line');
            }
          );
      }
    }
  }

  /**
   * Start a new discussion
   *
   * @param editor CodeMirror editor
   * @param lineNo Line at which to start a discussion
   * @param side Diff side
   */
  protected createThread(
    editor: CodeMirror.Editor,
    lineNo: number,
    side: 'line' | 'originalLine'
  ): void {
    const newThread = this._props.threads.find(
      thread_ => thread_[side] === lineNo + 1 && thread_.comments.length === 0
    );
    if (!newThread) {
      const thread: IThread = {
        comments: new Array<IComment>(),
        pullRequestId: this._props.pullRequestId,
        filename: this._props.filename
      };
      thread[side] = lineNo + 1;
      this._props.threads.push(thread);
      editor.addLineWidget(lineNo, this.makeThreadWidget(thread));
    }
  }

  /**
   * Create the widget associated with a discussion
   *
   * @param thread Discussion
   */
  protected makeThreadWidget(thread: IThread): HTMLElement {
    const widget = new Discussion({
      renderMime: this._props.renderMime,
      thread,
      handleRemove: (): void => {
        const threadIndex = this._props.threads.findIndex(
          thread_ => thread.id === thread_.id
        );
        this._props.threads.splice(threadIndex, 1);
        this.removeThreadWidget(widget);
      }
    });
    this.addThreadWidget(widget);
    return widget.node;
  }

  /**
   * Update discussion displayed when editor view port changes
   *
   * @param editor CodeMirror editor
   * @param from First line displayed
   * @param to Last line displayed
   * @param side Diff side
   */
  protected updateView(
    editor: CodeMirror.Editor,
    from: number,
    to: number,
    side: 'line' | 'originalLine'
  ): void {
    // Add comment gutters
    this.setCommentGutter(editor, from, to, side);
    // Add comments
    this._props.threads
      .filter(
        thread =>
          thread[side] !== null && from < thread[side] && thread[side] <= to
      )
      .forEach(thread => {
        editor.addLineWidget(thread[side] - 1, this.makeThreadWidget(thread));
      });
  }

  private addThreadWidget(widget: Widget): void {
    this._threadWidgets.push(widget);
  }

  private removeThreadWidget(widget: Widget): void {
    widget.node.remove();
    this._threadWidgets
      .splice(
        this._threadWidgets.findIndex(widget_ => widget_ === widget),
        1
      )[0]
      .dispose();
  }

  protected _props: IDiffOptions;
  // Keep track of discussion widgets to dispose them with this widget
  private _threadWidgets: Widget[] = [];
}
