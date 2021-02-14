import * as React from 'react';
import { BeatLoader } from 'react-spinners';
import { PullRequestFileModel, PullRequestModel } from '../../models';
import { doRequest } from '../../utils';
import { PullRequestBrowserFileItem } from './PullRequestBrowserFileItem';

export interface IPullRequestBrowserItemState {
  data: PullRequestModel[];
  isLoading: boolean;
  error: string | null;
}

export interface IPullRequestBrowserItemProps {
  header: string;
  filter: string;
  showTab: (data: PullRequestFileModel | PullRequestModel) => Promise<void>;
}

export class PullRequestBrowserItem extends React.Component<
  IPullRequestBrowserItemProps,
  IPullRequestBrowserItemState
> {
  constructor(props: IPullRequestBrowserItemProps) {
    super(props);
    this.state = { data: [], isLoading: true, error: null };
  }

  async componentDidMount() {
    await this.fetchPRs();
  }

  private async fetchPRs() {
    try {
      const jsonresults = await doRequest(
        'pullrequests/prs/user?filter=' + this.props.filter,
        'GET'
      );
      const results: PullRequestModel[] = [];
      for (const jsonresult of jsonresults) {
        results.push(
          new PullRequestModel(
            jsonresult['id'],
            jsonresult['title'],
            jsonresult['body'],
            jsonresult['url'],
            jsonresult['internal_id']
          )
        );
      }
      // render PRs while files load
      this.setState({ data: results, isLoading: true, error: null }, () => {
        this.fetchFiles(results);
      });
    } catch (err) {
      let msg = 'Unknown Error';
      if (err.response?.status && err.message) {
        msg = `${err.response.status} (${err.message})`;
      }
      this.setState({ data: [], isLoading: false, error: msg });
    }
  }

  private async fetchFiles(items: PullRequestModel[]) {
    Promise.all(
      items.map(async item => {
        await item.getFiles();
      })
    )
      .then(() => {
        this.setState({ data: items, isLoading: false, error: null });
      })
      .catch(e => {
        const msg = `Get Files Error (${e})`;
        this.setState({ data: [], isLoading: false, error: msg });
      });
  }

  // This makes a shallow copy of data[i], the data[i].files are not copied
  // If files need to be mutated, will need to restructure props / deep copy
  private toggleFilesExpanded(
    e: React.MouseEvent<HTMLSpanElement, MouseEvent>,
    i: number
  ) {
    e.stopPropagation();
    const data = [...this.state.data];
    const item = Object.assign({}, data[i]);
    item.isExpanded = !item.isExpanded;
    data[i] = item;
    this.setState({ data });
  }

  private openLink(
    e: React.MouseEvent<HTMLSpanElement, MouseEvent>,
    link: string
  ) {
    e.stopPropagation();
    window.open(link, '_blank');
  }

  private showFileTab(
    e: React.MouseEvent<HTMLSpanElement, MouseEvent>,
    file: PullRequestFileModel
  ) {
    e.stopPropagation();
    this.props.showTab(file);
  }

  render() {
    return (
      <li className="jp-PullRequestBrowserItem">
        <header>
          <h2>{this.props.header}</h2>
          <BeatLoader
            sizeUnit={'px'}
            size={5}
            color={'var(--jp-ui-font-color1)'}
            loading={this.state.isLoading}
          />
        </header>
        {this.state.error ? (
          <h2 className="jp-PullRequestBrowserItemError">
            <span style={{ color: 'var(--jp-ui-font-color1)' }}>
              Error Listing Pull Requests:
            </span>{' '}
            {this.state.error}
          </h2>
        ) : (
          <ul className="jp-PullRequestBrowserItemList">
            {this.state.data.map((result, i) => (
              <div key={i} onClick={() => this.props.showTab(result)}>
                <li className="jp-PullRequestBrowserItemListItem">
                  <h2>{result.title}</h2>
                  <div className="jp-PullRequestBrowserItemListItemIconWrapper">
                    <span
                      className="jp-Icon jp-Icon-16 jp-LinkIcon"
                      onClick={e => this.openLink(e, result.link)}
                    />
                    <span
                      className={
                        'jp-Icon jp-Icon-16 ' +
                        (result.isExpanded
                          ? 'jp-CaretUp-icon'
                          : 'jp-CaretDown-icon')
                      }
                      onClick={e => this.toggleFilesExpanded(e, i)}
                    />
                  </div>
                </li>
                {result.isExpanded && (
                  <ul className="jp-PullRequestBrowserItemFileList">
                    {result.files?.map((file, k) => (
                      <li key={k} onClick={e => this.showFileTab(e, file)}>
                        <PullRequestBrowserFileItem file={file} />
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
