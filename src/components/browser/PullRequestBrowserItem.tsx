import * as React from "react";
import { BeatLoader } from "react-spinners";
import { apiRequest, PullRequestItem } from "../../utils";

export interface IPullRequestBrowserItemState {
  data: PullRequestItem[];
  isLoading: boolean;
  error: string;
}

export interface IPullRequestBrowserItemProps {
  header: string;
  filter: string;
  showTab: (data: PullRequestItem) => Promise<void>;
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
        this.setState({ data: results, isLoading: false, error: null });
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
              <li
                className="jp-PullRequestBrowserItemListItem"
                key={i}
                onClick={() => this.props.showTab(result)}
              >
                {result.title}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }
}
