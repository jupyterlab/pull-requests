import { IThemeManager } from "@jupyterlab/apputils";
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Widget } from "@phosphor/widgets";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { PullRequestFileModel } from "../../models";
import { PullRequestTab } from "./PullRequestTab";

// Assumes valid json
export class PullRequestTabWidget extends Widget {
  
  constructor(file: PullRequestFileModel, themeManager: IThemeManager, renderMime: IRenderMimeRegistry) {
    super();
    this.id = file.id; // IDs in format 123456-README.md
    this.title.label = file.name;
    this.title.closable = true;
    ReactDOM.render(
      <PullRequestTab file={file} themeManager={themeManager} renderMime={renderMime} />,
      this.node
    );
  }
}
