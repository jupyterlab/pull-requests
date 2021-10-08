/* eslint-disable @typescript-eslint/ban-ts-comment */
import { PlainTextDiff } from '@jupyterlab/git';
import { DiffModel } from '@jupyterlab/git/lib/components/diff/model';
import { Widget } from '@lumino/widgets';
import { LineWidget, MergeView } from 'codemirror';
import { IComment, IDiffOptions, IThread } from '../../tokens';
import { generateNode } from '../../utils';
import { Discussion } from '../discussion/Discussion';

interface IInlineDiscussions {
  /**
   * Discussion widget
   */
  discussion: Widget;
  /**
   * Thread ID
   */
  id?: string | number;
  /**
   * Line at which the widget is displayed
   */
  line: number;
  /**
   * Editor these discussions are related to
   */
  side: 'line' | 'originalLine';
  /**
   * CodeMirror widget wrapping the discussion widgets
   */
  wrapper?: LineWidget;
}

/**
 * Plain Text Diff widget
 */
export class PlainTextPRDiff extends PlainTextDiff {
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
      widget.discussion.node.remove();
      widget.discussion.dispose();
      widget.wrapper?.clear();
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
   * @param side Which side of the editor is modified
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
   */
  protected async createDiffView(
    challengerContent: string,
    referenceContent: string
  ): Promise<void> {
    await super.createDiffView(challengerContent, referenceContent);

    if (this._mergeView) {
      {
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

      const inlineDiscussions: IInlineDiscussions = {
        line: lineNo,
        side,
        discussion: this.makeThreadWidget(thread)
      };
      this._threadWidgets.push(inlineDiscussions);

      inlineDiscussions.wrapper = editor.addLineWidget(
        lineNo,
        inlineDiscussions.discussion.node
      );
    }
  }

  /**
   * Returns default CodeMirror editor options
   *
   * @returns CodeMirror editor options
   */
  protected getDefaultOptions(): Partial<MergeView.MergeViewEditorConfiguration> {
    return {
      ...super.getDefaultOptions(),
      gutters: [
        'CodeMirror-linenumbers',
        // without this - the comment decoration does not show up
        //   But it add a single comment decoration on the first line of each editors
        'jp-PullRequestCommentDecoration',
        'CodeMirror-patchgutter'
      ]
    };
  }

  /**
   * Create the widget associated with a discussion
   *
   * @param thread Discussion
   */
  protected makeThreadWidget(thread: IThread): Widget {
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
    return widget;
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

    //   Clean first hidden discussions or those without id
    this._threadWidgets
      .filter(
        inlineWidget =>
          inlineWidget.side === side &&
          (inlineWidget.line < from || inlineWidget.line > to)
      )
      .forEach(inlineWidget =>
        this.removeThreadWidget(inlineWidget.discussion)
      );

    this._props.threads
      .filter(
        thread =>
          thread[side] !== null && from < thread[side] && thread[side] <= to
      )
      .forEach(thread => {
        const line = thread[side] - 1;

        if (
          thread.id &&
          !this._threadWidgets.some(
            inlineWidget => inlineWidget.id === thread.id
          )
        ) {
          const inlineDiscussions: IInlineDiscussions = {
            line,
            id: thread.id,
            side,
            discussion: this.makeThreadWidget(thread)
          };
          this._threadWidgets.push(inlineDiscussions);
          inlineDiscussions.wrapper = editor.addLineWidget(
            line,
            inlineDiscussions.discussion.node
          );
        }
      });
  }

  private removeThreadWidget(widget: Widget): void {
    const inlineDiscussion = this._threadWidgets.splice(
      this._threadWidgets.findIndex(widget_ => widget_.discussion === widget),
      1
    )[0];

    inlineDiscussion.discussion.node.remove();
    inlineDiscussion.discussion.dispose();
    inlineDiscussion.wrapper?.clear();
  }

  protected _props: IDiffOptions;
  // Keep track of discussion widget to dispose them with this widget
  // or when the editor view port is updated
  private _threadWidgets: IInlineDiscussions[] = [];
}
