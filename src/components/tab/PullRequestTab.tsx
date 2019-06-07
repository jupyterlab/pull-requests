import * as React from "react";
import { PullRequestItemFile } from "../../utils";

export interface IPullRequestTabState {}

export interface IPullRequestTabProps {
  data: PullRequestItemFile;
}

export class PullRequestTab extends React.Component<
  IPullRequestTabProps,
  IPullRequestTabState
> {
  constructor(props: IPullRequestTabProps) {
    super(props);
  }

  render() {
    return (
      <div className="jp-PullRequestTab">
        <h1>{this.props.data.name}</h1>
        <p>{this.props.data.status}</p>
      </div>
    );
  }
}
