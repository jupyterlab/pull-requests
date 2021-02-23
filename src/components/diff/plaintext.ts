import { Mode } from '@jupyterlab/codemirror';
import { mergeView } from '@jupyterlab/git/lib/components/diff/mergeview';
import { Widget } from '@lumino/widgets';
import { IDiffOptions } from '../../tokens';

export class PlainTextDiff extends Widget {
  constructor(props: IDiffOptions) {
    super();
    this.createDiffView(props);
  }

  protected createDiffView(props: IDiffOptions): void {
    const mode =
      Mode.findByFileName(props.filename) || Mode.findBest(props.filename);

    mergeView(this.node, {
      value: props.content.headContent,
      orig: props.content.baseContent,
      lineNumbers: true,
      mode: mode.mime,
      theme: 'jupyter',
      connect: 'align',
      collapseIdentical: true,
      readOnly: true,
      revertButtons: false
    });
  }
}
