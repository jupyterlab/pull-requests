/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { Mode } from '@jupyterlab/codemirror';
import { mergeView } from '@jupyterlab/git/lib/components/diff/mergeview';
import { Widget } from '@lumino/widgets';
import { MergeView } from 'codemirror';
import { IComment, IDiffOptions, IThread } from '../../tokens';
import { generateNode } from '../../utils';
import { CommentThread } from './CommentThread';

export class PlainTextDiff extends Widget {
  constructor(props: IDiffOptions) {
    super({ node: PlainTextDiff.createNode() });
    this._props = props;
  }

  /**
   * Callback to create the diff widget once the widget
   * is attached so CodeMirror get proper size.
   */
  onAfterAttach(): void {
    this.createDiffView(this._props);
  }

  /**
   * Create wrapper node
   */
  protected static createNode(): HTMLElement {
    const head = generateNode('div', { class: 'jp-git-diff-root' });
    head.appendChild(
      generateNode('div', {
        class: 'jp-git-PlainText-diff jp-PullRequestTextDiff'
      })
    );
    return head;
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
      const div = PlainTextDiff.makeCommentDecoration();
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
  protected createDiffView(props: IDiffOptions): void {
    const mode =
      Mode.findByFileName(props.filename) || Mode.findBest(props.filename);

    this._mergeView = mergeView(
      this.node.getElementsByClassName(
        'jp-git-PlainText-diff'
      )[0] as HTMLElement,
      {
        value: props.content.headContent,
        orig: props.content.baseContent,
        gutters: [
          'CodeMirror-linenumbers',
          // FIXME without this - the comment decoration does not show up
          //   But it add a single comment decoration on the first line of each editors
          'jp-PullRequestCommentDecoration',
          'CodeMirror-patchgutter'
        ],
        lineNumbers: true,
        mode: mode.mime,
        theme: 'jupyter',
        connect: 'align',
        collapseIdentical: true,
        readOnly: true,
        revertButtons: false
      }
    ) as MergeView.MergeViewEditor;

    {
      // @ts-ignore
      const { from, to } = this._mergeView.left.orig.getViewport();
      // @ts-ignore
      this.updateView(this._mergeView.left.orig, from, to, 'originalLine');
      // @ts-ignore
      this._mergeView.left.orig.on(
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
        pullRequestId: this._props.prId,
        filename: this._props.filename
      };
      thread[side] = lineNo + 1;
      this._props.threads.push(thread);
      editor.addLineWidget(lineNo, this.makeThreadWidget(thread));
    }
  }

  protected makeThreadWidget(thread: IThread): HTMLElement {
    const widget = new CommentThread({
      renderMime: this._props.renderMime,
      thread,
      handleRemove: (): void => {
        const threadIndex = this._props.threads.findIndex(
          thread_ => thread.id === thread_.id
        );
        this._props.threads.splice(threadIndex, 1);
        widget.node.parentElement.removeChild(widget.node);
        widget.dispose();
      }
    });
    return widget.node;
  }

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

  protected _mergeView: MergeView.MergeViewEditor;
  protected _props: IDiffOptions;
}
