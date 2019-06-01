import * as React from "react";
import { PullRequestItem } from "../../utils";

export interface IPullRequestTabState {}

export interface IPullRequestTabProps {
  data: PullRequestItem;
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
        <h1>{this.props.data.title}</h1>
        <p>{this.props.data.body}</p>
      </div>
    );
  }
}
