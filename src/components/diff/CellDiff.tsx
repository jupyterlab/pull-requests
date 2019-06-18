import { CellDiffWidget } from 'nbdime/lib/diff/widget';
import { RefObject } from 'react';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { CellDiffModel } from 'nbdime/lib/diff/model';
import * as React from 'react';

export interface ICellDiffProps {
  renderMime: IRenderMimeRegistry;
  cellChunk: CellDiffModel[];
  mimeType: string;
}

/**
 * A React component which renders the diff is a single Notebook cell.
 *
 * This uses the NBDime PhosporJS CellDiffWidget internally. To get around the
 * PhosporJS <=> ReactJS barrier, it uses React Refs(https://reactjs.org/docs/refs-and-the-dom.html)
 *
 * During component render, a Ref is created for the ReactDOM and after the component
 * is mounted, the PhosporJS widget is created and attached to the Ref.
 */
export class CellDiff extends React.Component<ICellDiffProps, {}> {
  private unmodifiedCellRef: RefObject<HTMLDivElement> = React.createRef<
    HTMLDivElement
  >();
  private addedRef: RefObject<HTMLDivElement> = React.createRef<
    HTMLDivElement
  >();
  private removedRef: RefObject<HTMLDivElement> = React.createRef<
    HTMLDivElement
  >();

  constructor(props: ICellDiffProps) {
    super(props);
    this.state = {};
  }

  componentDidMount(): void {
    const chunk = this.props.cellChunk;
    if (chunk.length === 1 && !(chunk[0].added || chunk[0].deleted)) {
      const widget = new CellDiffWidget(
        chunk[0],
        this.props.renderMime,
        this.props.mimeType
      );
      this.unmodifiedCellRef.current.appendChild(widget.node);
    } else {
      for (let j = 0; j < chunk.length; j++) {
        const cell = chunk[j];
        const ref = cell.deleted ? this.removedRef : this.addedRef;
        const widget = new CellDiffWidget(
          cell,
          this.props.renderMime,
          this.props.mimeType
        );
        ref.current.appendChild(widget.node);
      }
    }
  }

  render() {
    const chunk = this.props.cellChunk;
    return (
      <React.Fragment>
        {chunk.length === 1 && !(chunk[0].added || chunk[0].deleted) ? (
          <div ref={this.unmodifiedCellRef} />
        ) : (
          <div className={'jp-Diff-addremchunk'}>
            <div className={'jp-Diff-addedchunk'} ref={this.addedRef} />
            <div className={'jp-Diff-removedchunk'} ref={this.removedRef} />
          </div>
        )}
      </React.Fragment>
    );
  }
}