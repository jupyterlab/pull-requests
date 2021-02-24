import { Mode } from '@jupyterlab/codemirror';
import { mergeView } from '@jupyterlab/git/lib/components/diff/mergeview';
import { Widget } from '@lumino/widgets';
import { MergeView } from 'codemirror';
import { IDiffOptions } from '../../tokens';
import { generateNode } from '../../utils';

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
  protected static setCommentGutter(
    editor: CodeMirror.Editor,
    from: number,
    to: number
  ): void {
    editor.clearGutter('jp-PullRequestCommentDecoration');
    for (let lineIdx = from; lineIdx < to; lineIdx++) {
      editor.setGutterMarker(
        lineIdx,
        'jp-PullRequestCommentDecoration',
        PlainTextDiff.makeCommentDecoration()
      );
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

    const { from, to } = this._mergeView.editor().getViewport();
    PlainTextDiff.setCommentGutter(this._mergeView.editor(), from, to);
    this._mergeView
      .editor()
      .on('viewportChange', PlainTextDiff.setCommentGutter);
  }

  protected _mergeView: MergeView.MergeViewEditor;
  protected _props: IDiffOptions;
}
