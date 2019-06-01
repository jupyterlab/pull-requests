import { Widget } from "@phosphor/widgets";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { PullRequestItem } from "../../utils";
import { PullRequestTab } from "./PullRequestTab";

// Assumes valid json
export class PullRequestTabWidget extends Widget {
  constructor(data: PullRequestItem) {
    super();
    this.id = data.id;
    this.title.label = data.title;
    this.title.closable = true;
    ReactDOM.render(<PullRequestTab data={data} />, this.node);
  }
}
