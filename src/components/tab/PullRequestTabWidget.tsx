import { Widget } from "@phosphor/widgets";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { PullRequestItemFile } from "../../utils";
import { PullRequestTab } from "./PullRequestTab";

// Assumes valid json
export class PullRequestTabWidget extends Widget {
  constructor(data: PullRequestItemFile) {
    super();
    this.id = data.id; // IDs in format 123456-README.md
    this.title.label = data.name;
    this.title.closable = true;
    ReactDOM.render(<PullRequestTab data={data} />, this.node);
  }
}
