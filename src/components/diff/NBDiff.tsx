import * as nbformat from '@jupyterlab/nbformat';
import { RenderMimeProvider } from '@jupyterlab/git/lib/components/diff/Diff';
import { CellDiff } from '@jupyterlab/git/lib/components/diff/NbDiff';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { isNull, isUndefined } from 'lodash';
import * as jsonMap from 'json-source-map';
import { IDiffEntry } from 'nbdime/lib/diff/diffentries';
import { CellDiffModel, NotebookDiffModel } from 'nbdime/lib/diff/model';
import * as React from 'react';
import {
  PullRequestCommentThreadModel,
  PullRequestFileModel
} from '../../models';
import { requestAPI } from '../../utils';
import { PullRequestCommentThread } from './PullRequestCommentThread';

export interface IDiffProps {
  file: PullRequestFileModel;
  renderMime: IRenderMimeRegistry;
}

export interface INBDiffState {
  nbdModel: NotebookDiffModel;
  prChunks: PullRequestChunkModel[];
  error: string;
}

export class NBDiff extends React.Component<IDiffProps, INBDiffState> {
  constructor(props: IDiffProps) {
    super(props);
    this.state = {
      nbdModel: undefined,
      prChunks: undefined,
      error: undefined
    };
    this.performDiff();
  }

  render() {
    if (!isUndefined(this.state.error)) {
      return (
        <h2 className="jp-PullRequestTabError">
          <span style={{ color: 'var(--jp-ui-font-color1)' }}>
            Error Loading File:
          </span>{' '}
          {this.state.error}
        </h2>
      );
    } else if (
      !isUndefined(this.state.nbdModel) &&
      !isUndefined(this.state.prChunks)
    ) {
      const cellComponents = this.state.prChunks.map((prChunk, index) => (
        <div className="jp-PullRequestNBDiff" key={index}>
          <div className="jp-PullRequestCellDiff">
            <div className="jp-PullRequestCellDiffContent">
              <CellDiff
                cellChunk={prChunk.chunk}
                mimeType={this.state.nbdModel.mimetype}
              />
            </div>
            <div className="jp-PullRequestCellDiffCommentContainer">
              {!isUndefined(prChunk.lineNumber.lineNumberStart) && (
                <div
                  className="jp-PullRequestCellDiffComment"
                  onClick={() => this.addComment(index)}
                >
                  <div className="jp-PullRequestCommentDecoration"></div>
                </div>
              )}
            </div>
          </div>
          {!isUndefined(prChunk.comments) &&
            prChunk.comments.map((comment, i) => (
              <PullRequestCommentThread
                key={i}
                thread={comment}
                handleRemove={() => this.removeComment(index, comment)}
              />
            ))}
        </div>
      ));
      return (
        <RenderMimeProvider value={this.props.renderMime}>
          <div className="jp-git-diff-Widget">
            <div className="jp-git-diff-root jp-mod-hideunchanged">
              <div className="jp-git-Notebook-diff">
                {/* Header goes here */}
                {cellComponents}
              </div>
            </div>
          </div>
        </RenderMimeProvider>
      );
    } else {
      return null;
    }
  }

  private async performDiff() {
    try {
      const jsonresults = await requestAPI<any>(
        'pullrequests/files/nbdiff',
        'POST',
        {
          // eslint-disable-next-line @typescript-eslint/camelcase
          prev_content: this.props.file.basecontent,
          // eslint-disable-next-line @typescript-eslint/camelcase
          curr_content: this.props.file.headcontent
        }
      );
      const base = jsonresults['base'] as nbformat.INotebookContent;
      const diff = (jsonresults['diff'] as any) as IDiffEntry[];
      const nbdModel = new NotebookDiffModel(base, diff);
      this.setState({
        nbdModel: nbdModel,
        prChunks: this.getPRChunks(this.reChunkCells(nbdModel.chunkedCells))
      });
    } catch (e) {
      const msg = `Load ipynb Diff Error (${e.message})`;
      this.setState({ error: msg });
    }
  }

  private reChunkCells(originalChunks: CellDiffModel[][]): CellDiffModel[][] {
    const newChunks: CellDiffModel[][] = [];
    for (const chunk of originalChunks) {
      // If chunk is unmodified, push it to stack
      if (chunk.length === 1 && !(chunk[0].added || chunk[0].deleted)) {
        newChunks.push([chunk[0]]);
      } else {
        let modifiedPair: ModifiedChunkPair = new ModifiedChunkPair(null, null);
        for (const cell of chunk) {
          if (cell.deleted) {
            // if 'removed' not in chunk, add to chunk
            if (modifiedPair.removedCell === null) {
              modifiedPair.removedCell = cell;
            }
            // if 'removed' already in chunk, push chunk to chunks and start new chunk
            else {
              newChunks.push(modifiedPair.toArray());
              modifiedPair = new ModifiedChunkPair(null, cell);
            }
          } else {
            // if 'added' not in chunk, add to chunk
            if (modifiedPair.addedCell === null) {
              modifiedPair.addedCell = cell;
            }
            // if 'added' already in chunk, push chunk to chunks and start new chunk
            else {
              newChunks.push(modifiedPair.toArray());
              modifiedPair = new ModifiedChunkPair(cell, null);
            }
          }
        }
        // if nonempty at end, push the remaining pair
        if (!modifiedPair.isEmpty()) {
          newChunks.push(modifiedPair.toArray());
        }
      }
    }
    return newChunks;
  }

  private addComment(i: number) {
    for (const comment of this.state.prChunks[i].comments) {
      if (isNull(comment.comment)) {
        return;
      }
    }

    const commentToAdd: PullRequestCommentThreadModel = new PullRequestCommentThreadModel(
      '',
      this.props.file.name,
      this.props.file.commitId,
      this.state.prChunks[i].lineNumber.lineNumberStart
    );

    const prChunks = [...this.state.prChunks];
    const prChunk = { ...prChunks[i] };
    prChunk.comments = [...prChunk.comments, commentToAdd];
    prChunks[i] = prChunk;
    this.setState({ prChunks: prChunks });
  }

  removeComment(i: number, commentToRemove: PullRequestCommentThreadModel) {
    const prChunks = [...this.state.prChunks];
    const prChunk = { ...prChunks[i] };
    prChunk.comments = [
      ...prChunk.comments.filter(comment => comment !== commentToRemove)
    ];
    prChunks[i] = prChunk;
    this.setState({ prChunks: prChunks });
  }

  private getPRChunks(
    originalChunks: CellDiffModel[][]
  ): PullRequestChunkModel[] {
    // Parse headContent
    const contentCells = jsonMap.parse(this.props.file.headcontent);

    // Unchunk, add line numbers if applicable, and rechunk
    const prChunks: PullRequestChunkModel[] = [];
    let i = 0;
    for (const chunk of originalChunks) {
      for (const cell of chunk) {
        // Add line numbers if it exists in remote
        if (!isNull(cell.source.remote)) {
          const prChunk: PullRequestChunkModel = new PullRequestChunkModel(
            chunk,
            this.props.file
          );
          const headNbdimeSource = cell.source.remote;
          let headContentSource = '';
          for (const line of contentCells.data.cells[i].source) {
            headContentSource += line;
          }
          if (headNbdimeSource !== headContentSource) {
            throw new Error(
              'Error parsing line numbers: Mismatched source nbdime (' +
                headNbdimeSource +
                ') and content (' +
                headContentSource +
                ')'
            );
          }
          prChunk.lineNumber = {
            lineNumberStart: contentCells.pointers['/cells/' + i].value.line,
            lineNumberEnd: contentCells.pointers['/cells/' + i].valueEnd.line
          };
          // Add any comments within the range
          const prCellComments: PullRequestCommentThreadModel[] = [];
          this.props.file.comments.forEach(thread => {
            if (
              thread.lineNumber >= prChunk.lineNumber.lineNumberStart &&
              thread.lineNumber <= prChunk.lineNumber.lineNumberEnd
            ) {
              prCellComments.push(
                new PullRequestCommentThreadModel(
                  '',
                  this.props.file.name,
                  this.props.file.commitId,
                  thread.comment
                )
              );
            }
          });
          if (prCellComments.length > 0) {
            prChunk.comments = prCellComments;
          }
          i++;
          prChunks.push(prChunk);
        }
      }
    }
    return prChunks;
  }
}

export class ModifiedChunkPair {
  constructor(addedCell: CellDiffModel, removedCell: CellDiffModel) {
    this.addedCell = addedCell;
    this.removedCell = removedCell;
  }

  isEmpty(): boolean {
    return this.addedCell === null && this.removedCell === null;
  }

  toArray(): CellDiffModel[] {
    const arr: CellDiffModel[] = [];
    if (this.addedCell !== null) {
      arr.push(this.addedCell);
    }
    if (this.removedCell !== null) {
      arr.push(this.removedCell);
    }
    return arr;
  }

  addedCell: CellDiffModel;
  removedCell: CellDiffModel;
}

export interface IPullRequestLineNumber {
  lineNumberStart: number;
  lineNumberEnd: number;
}

export class PullRequestChunkModel {
  constructor(
    chunk: CellDiffModel[],
    file: PullRequestFileModel,
    comments: PullRequestCommentThreadModel[] = [],
    lineNumber?: IPullRequestLineNumber
  ) {
    this.chunk = chunk;
    this.file = file;
    this.lineNumber = lineNumber;
    this.comments = comments;
  }

  chunk: CellDiffModel[];
  file: PullRequestFileModel;
  lineNumber?: IPullRequestLineNumber;
  comments?: PullRequestCommentThreadModel[];
}
