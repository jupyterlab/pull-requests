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
        this._spinner.dispose();
        this.showDiff(
          props.pullRequestId,
          props.filename,
          content,
          threads,
          props.renderMime
        );
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
  ): Promise<[IFileContent, IThread[]]> {
    return Promise.all([
      requestAPI<IFileContent>(
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
    content: IFileContent,
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
        this.showError(reason.message || reason);
      }
    }
  }

  protected showError(message: string): void {
    while (this.children().next()) {
      this.children()
        .next()
        .dispose();
    }
    this.node.innerHTML = `<h2 class="jp-PullRequestTabError"><span style="color: 'var(--jp-ui-font-color1)';">Error Loading File:</span> ${message}</h2>`;
  }

  private _spinner: Spinner;
}
