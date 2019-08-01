import { IThemeManager, Spinner } from "@jupyterlab/apputils";
import { isNull } from "lodash";
import * as React from "react";
import { RefObject } from "react";
import { PullRequestModel } from "../../models";

export interface IPullRequestDescriptionTabState {
  pr: PullRequestModel;
  isLoading: boolean;
  error: string;
}

export interface IPullRequestDescriptionTabProps {
  pr: PullRequestModel;
  themeManager: IThemeManager;
}

export class PullRequestDescriptionTab extends React.Component<
  IPullRequestDescriptionTabProps,
  IPullRequestDescriptionTabState
> {
  private spinnerContainer: RefObject<HTMLDivElement> = React.createRef<
    HTMLDivElement
  >();

  constructor(props: IPullRequestDescriptionTabProps) {
    super(props);
    this.state = { pr: props.pr, isLoading: true, error: null };
  }

  componentDidMount() {
    this.spinnerContainer.current.appendChild(new Spinner().node);
    this.setState({ isLoading: false });
  }

  render() {
    return (
      <div className="jp-PullRequestTab">
        {!this.state.isLoading ? (
          isNull(this.state.error) && !isNull(this.state.pr) ? (
            <div className="jp-PullRequestDescriptionTab">
              <h1>{this.state.pr.title}</h1>
              <h2>{this.state.pr.body}</h2>
              <button
                className="jp-Button-flat jp-mod-styled jp-mod-accept"
                onClick={() => window.open(this.state.pr.link, "_blank")}
              >
                View Details
              </button>
            </div>
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
