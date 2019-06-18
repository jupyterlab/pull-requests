import { IThemeManager } from "@jupyterlab/apputils";
import * as React from "react";
import { RingLoader } from "react-spinners";
import { PullRequestFileModel } from "../../models";
import { PlainDiffComponent } from "../diff/PlainDiffComponent";

export interface IPullRequestTabState {
  data: PullRequestFileModel;
  isLoading: boolean;
  error: string;
}

export interface IPullRequestTabProps {
  data: PullRequestFileModel;
  themeManager: IThemeManager;
}

export class PullRequestTab extends React.Component<
  IPullRequestTabProps,
  IPullRequestTabState
> {
  constructor(props: IPullRequestTabProps) {
    super(props);
    this.state = { data: null, isLoading: true, error: null };
  }

  componentDidMount() {
    this.loadDiff();
  }

  private async loadDiff() {
    let _data = this.props.data;
    try {
      await _data.loadFile();
      await _data.loadComments();
    } catch (e) {
      const msg = `Load File Error (${e.message})`;
      this.setState({ data: null, isLoading: false, error: msg });
      return;
    }
    this.setState({ data: _data, isLoading: false, error: null });
  }

  render() {
    return (
      <div className="jp-PullRequestTab">
        {!this.state.isLoading ? (
          (this.state.error == null ? (
            <PlainDiffComponent
              data={this.state.data}
              themeManager={this.props.themeManager}
            />
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
