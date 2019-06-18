import { IThemeManager } from "@jupyterlab/apputils";
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { isNull } from "lodash";
import * as React from "react";
import { RingLoader } from "react-spinners";
import { PullRequestFileModel } from "../../models";
import { NBDiff } from "../diff/NBDiff";
import { PlainDiffComponent } from "../diff/PlainDiffComponent";

export interface IPullRequestTabState {
  file: PullRequestFileModel;
  isLoading: boolean;
  error: string;
}

export interface IPullRequestTabProps {
  file: PullRequestFileModel;
  themeManager: IThemeManager;
  renderMime: IRenderMimeRegistry;
}

export class PullRequestTab extends React.Component<
  IPullRequestTabProps,
  IPullRequestTabState
> {
  constructor(props: IPullRequestTabProps) {
    super(props);
    this.state = { file: null, isLoading: true, error: null };
  }

  componentDidMount() {
    this.loadDiff();
  }

  private async loadDiff() {
    let _data = this.props.file;
    try {
      await _data.loadFile();
      await _data.loadComments();
    } catch (e) {
      const msg = `Load File Error (${e.message})`;
      this.setState({ file: null, isLoading: false, error: msg });
      return;
    }
    this.setState({ file: _data, isLoading: false, error: null });
  }

  render() {
    return (
      <div className="jp-PullRequestTab">
        {!this.state.isLoading ? (
          (isNull(this.state.error) && !isNull(this.state.file) ? (
            (this.state.file.extension === ".ipynb" ? (
              <NBDiff
                file={this.state.file}
                renderMime={this.props.renderMime}
              />
            ) : (
              <PlainDiffComponent
                file={this.state.file}
                themeManager={this.props.themeManager}
              />
            ))
          ) : (
            <h2 className="jp-PullRequestTabError">
              <span style={{ color: "var(--jp-ui-font-color1)" }}>
                Error Loading File:
              </span>{" "}
              {this.state.error}
            </h2>
          ))
        ) : (
          <div className="jp-PullRequestTabLoadingContainer">
            <RingLoader
              sizeUnit={"px"}
              size={60}
              color={"var(--jp-ui-font-color2)"}
              loading={this.state.isLoading}
            />
          </div>
        )}
      </div>
    );
  }
}
