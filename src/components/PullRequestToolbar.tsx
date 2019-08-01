import { Toolbar, ToolbarButton } from "@jupyterlab/apputils";
import { Widget } from "@phosphor/widgets";
import { PullRequestPanel } from "./PullRequestPanel";

export class PullRequestToolbar extends Toolbar {
  private _openRefreshButton: ToolbarButton;

  constructor(panel: PullRequestPanel) {
    super();
    this.addClass("jp-PullRequestToolbar");

    // Add toolbar header
    let widget: Widget = new Widget();
    let title = document.createElement("h2");
    title.innerText = "Pull Requests";
    widget.addClass("jp-PullRequestToolbarHeader");
    widget.node.appendChild(title);
    this.addItem("Widget", widget);

    // Add toolbar refresh button
    this._openRefreshButton = new ToolbarButton({
      onClick: () => {
        panel.update();
      },
      iconClassName: "jp-Refresh-icon jp-Icon jp-Icon-16",
      tooltip: "Refresh"
    });
    this._openRefreshButton.addClass("jp-PullRequestToolbarItem");
    this.addItem("Refresh", this._openRefreshButton);
  }
}
