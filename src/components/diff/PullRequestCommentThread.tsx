import { isNull, isUndefined } from "lodash";
import * as React from "react";
import { PullRequestCommentModel, PullRequestCommentThreadModel, PullRequestPlainDiffCommentThreadModel } from "../../models";

export interface IPullRequestCommentThreadState {
  isExpanded: boolean;
  inputText: string;
  comments: PullRequestCommentModel;
}

export interface IPullRequestCommentThreadProps {
  thread: PullRequestCommentThreadModel;
  plaindiff?: PullRequestPlainDiffCommentThreadModel;
}

export class PullRequestCommentThread extends React.Component<
  IPullRequestCommentThreadProps,
  IPullRequestCommentThreadState
> {

  constructor(props: IPullRequestCommentThreadProps) {
    super(props);
    this.state = { isExpanded: true, inputText: '', comments: this.props.thread.comments };
  }

  componentDidUpdate(prevProps: IPullRequestCommentThreadProps, prevState: IPullRequestCommentThreadState) {
    // Don't update plain diff it its only a input text change
    if (this.state.inputText != prevState.inputText) {
      return;
    }
    if (!isUndefined(this.props.plaindiff)) {
      this.props.plaindiff.toggleUpdate();
    }
  }

  handleInputChange = (event: any) => {
    this.setState({ inputText: event.target.value });
  };

  async handleSubmit() {
    let _thread = this.props.thread;
    let payload;
    if (!isNull(this.state.comments)) {
      payload = _thread.getCommentReplyBody(this.state.inputText);
    } else {
      payload = _thread.getCommentNewBody(this.state.inputText);
    }
    await _thread.postComment(payload);
    this.setState({comments: _thread.comments});
    this.setState({inputText: ""});
  }

  getCommentItemDom(item: PullRequestCommentModel) {
    return (
      <div className="jp-PullRequestCommentItem">
        {!isUndefined(item.userpic) && (
          <div className="jp-PullRequestCommentItemImg">
            <img src={item.userpic}></img>
          </div>
        )}
        <div className="jp-PullRequestCommentItemContent">
          <h2>{item.username}</h2>
          <p>{item.text}</p>
        </div>
      </div>
    )
  }

  render() {
    return (
      <div className="jp-PullRequestComment">
        <div className="jp-PullRequestCommentHeader">
          {!this.state.isExpanded && !isNull(this.state.comments) &&
            <p>{this.state.comments.username}: {this.state.comments.text}</p>
          }
          <span
            className={
              "jp-Icon jp-Icon-20 " +
              (this.state.isExpanded
                ? "jp-CaretUp-icon"
                : "jp-CaretDown-icon")
            }
            onClick={() => this.setState({isExpanded: !this.state.isExpanded})}
          />
        </div>
        {this.state.isExpanded &&
          <div>
            {!isNull(this.state.comments) &&
            <div>
              {this.getCommentItemDom(this.state.comments)}
              <div>
                {this.state.comments.replies.map((reply, i) => (
                  <div key={i}>
                    {this.getCommentItemDom(reply)}
                  </div>
                ))}
              </div>
            </div>
            }
            <div className="jp-PullRequestInputContainer">
              <input 
                placeholder="Leave a comment"
                value={this.state.inputText}
                onChange={this.handleInputChange}
              />
              <button onClick={() => this.handleSubmit()} disabled={this.state.inputText == ""}>Comment</button>
            </div>
          </div>
        }
      </div>
    );
  }
}
