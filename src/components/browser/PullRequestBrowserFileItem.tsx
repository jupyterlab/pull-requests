import * as React from "react";
import { PullRequestFileModel } from "../../models";

export interface IPullRequestBrowserFileItemState {}

export interface IPullRequestBrowserFileItemProps {
  file: PullRequestFileModel;
}

export class PullRequestBrowserFileItem extends React.Component<
  IPullRequestBrowserFileItemProps,
  IPullRequestBrowserFileItemState
> {
  constructor(props: IPullRequestBrowserFileItemProps) {
    super(props);
    this.state = { data: [], isLoading: true, error: null };
  }

  render() {
    return (
      <div
        className="jp-PullRequestBrowserFileItem"
        title={this.props.file.name}
      >
        <span
          className={
            "jp-Icon jp-Icon-16 jp-PullRequestBrowserFileItemIcon " +
            this.getExtensionIcon(this.props.file.extension)
          }
        ></span>
        <span className="jp-PullRequestBrowserFileItemName">
          {this.extractFilename(this.props.file.name)}
        </span>
        <span className="jp-PullRequestBrowserFileItemChanged">
          {this.props.file.status}
        </span>
        <div className="jp-PullRequestBrowserFileItemDiff">
          <span className="jp-PullRequestBrowserFileItemDiffText">
            {this.props.file.additions}
          </span>
          <span className="jp-Icon jp-Icon-13 jp-PullRequestBrowserFileItemDiffInserted"></span>
          <span className="jp-PullRequestBrowserFileItemDiffText">
            {this.props.file.deletions}
          </span>
          <span className="jp-Icon jp-Icon-13 jp-PullRequestBrowserFileItemDiffDeleted"></span>
        </div>
      </div>
    );
  }

  /** Get the extension of a given file */
  private getExtensionIcon(ext: string): string {
    switch (ext) {
      case ".ipynb":
        return "jp-NotebookIcon";
      case ".md":
        return "jp-MarkdownIcon";
      case ".py":
        return "jp-PythonIcon";
      case ".json":
        return "jp-JSONIcon";
      case ".csv":
        return "jp-SpreadsheetIcon";
      case ".xls":
        return "jp-FileIcon";
      case ".r":
        return "jp-RKernelIcon";
      case ".yml":
        return "jp-YamlIcon";
      case ".yaml":
        return "jp-YamlIcon";
      case ".svg":
        return "jp-ImageIcon";
      case ".tiff":
        return "jp-ImageIcon";
      case ".jpeg":
        return "jp-ImageIcon";
      case ".jpg":
        return "jp-ImageIcon";
      case ".gif":
        return "jp-ImageIcon";
      case ".png":
        return "jp-ImageIcon";
      case ".raw":
        return "jp-ImageIcon";
      default:
        return "jp-FileIcon";
    }
  }

  /** Get the filename from a path */
  private extractFilename(path: string): string {
    if (path[path.length - 1] === "/") {
      return path;
    } else {
      let temp = path.split("/");
      return temp[temp.length - 1];
    }
  }
}
