import { IThemeManager, Spinner } from "@jupyterlab/apputils";
import { IRenderMimeRegistry } from "@jupyterlab/rendermime";
import { isNull } from "lodash";
import * as React from "react";
import { RefObject } from "react";
import { PullRequestFileModel } from "../../models";
import { NBDiff } from "../diff/NBDiff";
import { PlainDiffComponent } from "../diff/PlainDiffComponent";

export interface IPullRequestFileTabState {
  file: PullRequestFileModel;
  isLoading: boolean;
  error: string;
}

export interface IPullRequestFileTabProps {
  file: PullRequestFileModel;
  themeManager: IThemeManager;
  renderMime: IRenderMimeRegistry;
}

export class PullRequestFileTab extends React.Component<
  IPullRequestFileTabProps,
  IPullRequestFileTabState
> {
  private spinnerContainer: RefObject<HTMLDivElement> = React.createRef<
    HTMLDivElement
  >();

  constructor(props: IPullRequestFileTabProps) {
    super(props);
    this.state = { file: null, isLoading: true, error: null };
  }

  async componentDidMount() {
    this.spinnerContainer.current.appendChild(new Spinner().node);
    await this.loadDiff();
  }

  private async loadDiff() {
    let _data = this.props.file;
    try {
      await _data.loadFile();
      await _data.loadComments();
    } catch (e) {
      let msg = `Load File Error (${e.message})`;
      if (e.message.toLowerCase().includes("'utf-8' codec can't decode")) {
        msg = `Diff for ${this.props.file.extension} files is not supported.`;
      }
      this.setState({ file: null, isLoading: false, error: msg });
      return;
    }
    this.setState({ file: _data, isLoading: false, error: null });
  }

  render() {
    return (
      <div className="jp-PullRequestTab">
        {!this.state.isLoading ? (
          isNull(this.state.error) && !isNull(this.state.file) ? (
            this.state.file.extension === ".ipynb" ? (
              <NBDiff
                file={this.state.file}
                renderMime={this.props.renderMime}
              />
            ) : (
              <PlainDiffComponent
                file={this.state.file}
                themeManager={this.props.themeManager}
              />
            )
          ) : (
            <h2 className="jp-PullRequestTabError">
              <span style={{ color: "var(--jp-ui-font-color1)" }}>
                Error Loading File:
              </span>{" "}
              {this.state.error}
            </h2>
          )
        ) : (
          <div className="jp-PullRequestTabLoadingContainer">
            <div ref={this.spinnerContainer}></div>
          </div>
        )}
      </div>
    );
  }
}
