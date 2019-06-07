import * as React from "react";
import { PullRequestItemFile } from "../../utils";
import { PullRequestBrowserItem } from "./PullRequestBrowserItem";

export interface IPullRequestBrowserState {}

export interface IPullRequestBrowserProps {
  showTab: (data: PullRequestItemFile) => Promise<void>;
}

export class PullRequestBrowser extends React.Component<
  IPullRequestBrowserProps,
  IPullRequestBrowserState
> {
  constructor(props: IPullRequestBrowserProps) {
    super(props);
  }

  render() {
    return (
      <div className="jp-PullRequestBrowser">
        <ul>
          <PullRequestBrowserItem
            showTab={this.props.showTab}
            header={"Created by Me"}
            filter={"created"}
          />
          <PullRequestBrowserItem
            showTab={this.props.showTab}
            header={"Assigned to Me"}
            filter={"assigned"}
          />
        </ul>
      </div>
    );
  }
}
