import { isNull, isUndefined } from "lodash";
import * as React from "react";
import ReactResizeDetector from 'react-resize-detector';
import { PullRequestCommentModel, PullRequestCommentThreadModel, PullRequestPlainDiffCommentThreadModel } from "../../models";

export interface IPullRequestCommentThreadState {
  isExpanded: boolean;
  isInput: boolean;
  inputText: string;
  comments: PullRequestCommentModel;
}

export interface IPullRequestCommentThreadProps {
  thread: PullRequestCommentThreadModel;
  plainDiff?: PullRequestPlainDiffCommentThreadModel;
}

export class PullRequestCommentThread extends React.Component<
  IPullRequestCommentThreadProps,
  IPullRequestCommentThreadState
> {

  constructor(props: IPullRequestCommentThreadProps) {
    super(props);
    this.state = {
      isExpanded: true,
      isInput: isNull(this.props.thread.comments) ? true : false,
      inputText: '',
      comments: this.props.thread.comments
    };
  }

  componentDidUpdate(prevProps: IPullRequestCommentThreadProps, prevState: IPullRequestCommentThreadState) {
    // Don't update plain diff it its only a input text change
    if (this.state.inputText != prevState.inputText) {
      return;
    }
  }

  handleInputChange = (event: any) => {
    this.setState({ inputText: event.target.value });
  };

  onResize = () => {
    if (!isUndefined(this.props.plainDiff)) {
      this.props.plainDiff.toggleUpdate();
    }
  }

  async handleSubmit() {
    let _thread = this.props.thread;
    let payload;
    if (!isNull(this.state.comments)) {
      payload = _thread.getCommentReplyBody(this.state.inputText);
    } else {
      payload = _thread.getCommentNewBody(this.state.inputText);
    }
    await _thread.postComment(payload);
    this.setState({comments: _thread.comments, isInput: false});
    this.setState({inputText: ""});
  }

  handleCancel() {
    // If no other comments, canceling should remove this thread
    if (isNull(this.state.comments)) {
      if (!isUndefined(this.props.plainDiff)) {
        this.props.plainDiff.plainDiff.removeComment(this.props.plainDiff);
        return;
      }
    }
    this.setState({isInput: false});
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
            {this.state.isInput ? (
              <div>
                <textarea
                  className="jp-PullRequestInputForm jp-PullRequestInputFormTextArea"
                  placeholder="Leave a comment"
                  value={this.state.inputText}
                  onChange={this.handleInputChange} 
                />
                <div className="jp-PullRequestInputButtonContainer">
                  <button
                    onClick={() => this.handleSubmit()}
                    disabled={this.state.inputText == ""}
                    className="jp-Button-flat jp-mod-styled jp-mod-accept"
                  >
                    Comment
                  </button>
                  <button
                    onClick={() => this.handleCancel()}
                    className="jp-Button-flat jp-mod-styled jp-mod-reject"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => this.setState({isInput: true})} className="jp-PullRequestInputForm jp-PullRequestInputFormButton">Reply...</button>
            )}
            </div>
          </div>
        }
        <ReactResizeDetector handleHeight={true} onResize={this.onResize} />
      </div>
    );
  }
}
