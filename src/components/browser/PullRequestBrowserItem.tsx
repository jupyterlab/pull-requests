import * as React from "react";
import { BeatLoader } from "react-spinners";
import { apiRequest, PullRequestItem, PullRequestItemFile } from "../../utils";

export interface IPullRequestBrowserItemState {
  data: PullRequestItem[];
  isLoading: boolean;
  error: string;
}

export interface IPullRequestBrowserItemProps {
  header: string;
  filter: string;
  showTab: (data: PullRequestItemFile) => Promise<void>;
}

export class PullRequestBrowserItem extends React.Component<
  IPullRequestBrowserItemProps,
  IPullRequestBrowserItemState
> {
  constructor(props: IPullRequestBrowserItemProps) {
    super(props);
    this.state = { data: [], isLoading: false, error: null };
  }

  componentDidMount() {
    this.setState({ isLoading: true });
    apiRequest("/pullrequests/prs/user?filter=" + this.props.filter)
      .then(data => {
        let jsonresults = JSON.parse(JSON.stringify(data));
        let results: PullRequestItem[] = [];
        for (let i in jsonresults) {
          results.push(new PullRequestItem(JSON.stringify(jsonresults[i])));
        }
        this.setState({ data: results, isLoading: true, error: null }); // render PRs while files load
        this.fetchFiles(results);
      })
      .catch(err => {
        let msg = "UNKNOWN ERROR";
        if (
          err.response != null &&
          err.response.status != null &&
          err.message != null
        ) {
          msg = `${err.response.status} (${err.message})`;
        }
        this.setState({ data: [], isLoading: false, error: msg });
      });
  }

  private async fetchFiles(items: PullRequestItem[]) {
    for (let i in items) {
      try {
        await items[i].getFiles();
      } catch (e) {
        const msg = `Get Files Error (${e.message})`;
        this.setState({ data: [], isLoading: false, error: msg });
        return;
      }
    }
    this.setState({ data: items, isLoading: false, error: null });
  }

  // This makes a shallow copy of data[i], the data[i].files are not copied
  // If files need to be mutated, will need to restructure props / deep copy
  private toggleFilesExpanded(i: number) {
    let data = [...this.state.data];
    let item = Object.assign({}, data[i]);
    item.isExpanded = !item.isExpanded;
    data[i] = item;
    this.setState({data});
  }

  render() {
    return (
      <li className="jp-PullRequestBrowserItem">
        <header>
          <h2>{this.props.header}</h2>
          <BeatLoader
            sizeUnit={"px"}
            size={5}
            color={"var(--jp-ui-font-color1)"}
            loading={this.state.isLoading}
          />
        </header>
        {this.state.error != null ? (
          <h2 className="jp-PullRequestBrowserItemError">
            <span style={{ color: "var(--jp-ui-font-color1)" }}>
              Error Listing Pull Requests:
            </span>{" "}
            {this.state.error}
          </h2>
        ) : (
          <ul className="jp-PullRequestBrowserItemList">
            {this.state.data.map((result, i) => (
              <div key={i}>
                <li className="jp-PullRequestBrowserItemListItem">
                  <h2>{result.title}</h2>
                  <div className="jp-PullRequestBrowserItemListItemIconWrapper">
                    <span
                      className={
                        "jp-Icon jp-Icon-16 " +
                        (result.isExpanded
                          ? "jp-CaretUp-icon"
                          : "jp-CaretDown-icon")
                      }
                      onClick={() => this.toggleFilesExpanded(i)}
                    />
                  </div>
                </li>
                {result.isExpanded && (
                  <ul className="jp-PullRequestBrowserItemFileList">
                    {result.files != null &&
                      result.files.map((fresult, k) => (
                        <li
                          key={k}
                          className="jp-PullRequestBrowserItemFileItem"
                          onClick={() => this.props.showTab(fresult)}
                        >
                          {fresult.name}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </ul>
        )}
      </li>
    );
  }
}
