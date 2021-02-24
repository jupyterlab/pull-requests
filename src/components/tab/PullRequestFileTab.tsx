import { Spinner } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Panel } from '@lumino/widgets';
import { IFileContent, IThread } from '../../tokens';
import { requestAPI } from '../../utils';
import { NotebookDiff } from '../diff/notebook';
import { PlainTextDiff } from '../diff/plaintext';

export interface IFileDiffWidgetProps {
  filename: string;
  pullRequestId: string;
  renderMime: IRenderMimeRegistry;
}

// FIXME change for a factory?
export class FileDiffWidget extends Panel {
  constructor(props: IFileDiffWidgetProps) {
    super();
    this.addClass('jp-PullRequestTab');
    this._spinner = new Spinner();
    this.addWidget(this._spinner);

    this.loadDiff(props.pullRequestId, props.filename)
      .then(([content, threads]) => {
        this.showDiff(
          props.pullRequestId,
          props.filename,
          content,
          threads,
          props.renderMime
        );
        this._spinner.dispose();
      })
      .catch(reason => {
        let msg = `Load File Error (${reason.message})`;
        if (
          reason.message.toLowerCase().includes("'utf-8' codec can't decode")
        ) {
          msg = `Diff for ${props.filename} is not supported.`;
        }
        this._spinner.dispose();
        this.showError(msg);
      });
  }

  protected async loadDiff(
    prId: string,
    filename: string
  ): Promise<[IFileContent<any>, IThread[]]> {
    return Promise.all([
      requestAPI<IFileContent<any>>(
        `pullrequests/files/content?id=${encodeURIComponent(
          prId
        )}&filename=${encodeURIComponent(filename)}`,
        'GET'
      ),
      requestAPI<IThread[]>(
        `pullrequests/files/comments?id=${encodeURIComponent(
          prId
        )}&filename=${encodeURIComponent(filename)}`,
        'GET'
      )
    ]);
  }

  protected showDiff(
    prId: string,
    filename: string,
    content: IFileContent<any>,
    threads: IThread[],
    renderMime: IRenderMimeRegistry
  ): void {
    const fileExtension = PathExt.extname(filename).toLowerCase();
    if (fileExtension === '.ipynb') {
      this.addWidget(
        new NotebookDiff({
          prId,
          filename,
          content,
          threads,
          renderMime
        })
      );
    } else {
      try {
        this.addWidget(
          new PlainTextDiff({
            prId,
            filename,
            content,
            threads,
            renderMime
          })
        );
      } catch (reason) {
        //FIXME
        console.error(reason);
      }
    }
  }

  protected showError(message: string): void {
    this.node.innerHTML = `<h2 class="jp-PullRequestTabError"><span style="color: 'var(--jp-ui-font-color1)';">Error Loading File:</span> ${message}</h2>`;
  }

  // private static createSpinner(): Widget {
  //   const div = document.createElement('div');
  //   div.className = 'jp-PullRequestTabLoadingContainer';
  //   div.append(new Spinner().node);
  //   return div;
  // }

  private _spinner: Spinner;
}

// export class PullRequestFileTab extends React.Component<
//   IPullRequestFileTabProps,
//   IPullRequestFileTabState
// > {
//   private spinnerContainer: RefObject<HTMLDivElement> = React.createRef<
//     HTMLDivElement
//   >();

//   constructor(props: IPullRequestFileTabProps) {
//     super(props);
//     this.state = { file: null, isLoading: true, error: null };
//   }

//   async componentDidMount() {
//     this.spinnerContainer.current.appendChild(new Spinner().node);
//     await this.loadDiff();
//   }

//   private async loadDiff() {
//     const _data = this.props.file;
//     try {
//       await _data.loadFile();
//       await _data.loadComments();
//     } catch (e) {
//       let msg = `Load File Error (${e.message})`;
//       if (e.message.toLowerCase().includes("'utf-8' codec can't decode")) {
//         msg = `Diff for ${this.props.file.extension} files is not supported.`;
//       }
//       this.setState({ file: null, isLoading: false, error: msg });
//       return;
//     }
//     this.setState({ file: _data, isLoading: false, error: null });
//   }

//   render() {
//     return (
//       <div className="jp-PullRequestTab">
//         {!this.state.isLoading ? (
//           isNull(this.state.error) && !isNull(this.state.file) ? (
//             this.state.file.extension === '.ipynb' ? (
//               <NBDiff
//                 file={this.state.file}
//                 renderMime={this.props.renderMime}
//               />
//             ) : (
//               <PlainDiffComponent
//                 file={this.state.file}
//                 themeManager={this.props.themeManager}
//               />
//             )
//           ) : (
//             <h2 className="jp-PullRequestTabError">
//               <span style={{ color: 'var(--jp-ui-font-color1)' }}>
//                 Error Loading File:
//               </span>{' '}
//               {this.state.error}
//             </h2>
//           )
//         ) : (
//           <div className="jp-PullRequestTabLoadingContainer">
//             <div ref={this.spinnerContainer}></div>
//           </div>
//         )}
//       </div>
//     );
//   }
// }
