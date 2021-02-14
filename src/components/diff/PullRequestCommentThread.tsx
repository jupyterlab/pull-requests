import { isNull, isUndefined } from 'lodash';
import * as React from 'react';
import ReactResizeDetector from 'react-resize-detector';
import {
  IPullRequestCommentModel,
  PullRequestCommentThreadModel,
  PullRequestPlainDiffCommentThreadModel
} from '../../models';
import moment from 'moment';

export interface IPullRequestCommentThreadState {
  isExpanded: boolean;
  isInput: boolean;
  inputText: string;
  thread: PullRequestCommentThreadModel;
}

export interface IPullRequestCommentThreadProps {
  thread: PullRequestCommentThreadModel;
  handleRemove: () => void;
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
      isInput: isNull(this.props.thread.comment) ? true : false,
      inputText: '',
      thread: this.props.thread
    };
  }

  componentDidUpdate(
    prevProps: IPullRequestCommentThreadProps,
    prevState: IPullRequestCommentThreadState
  ) {
    // Don't update plain diff it its only a input text change
    if (this.state.inputText !== prevState.inputText) {
      return;
    }
  }

  handleInputChange = (event: any) => {
    this.setState({ inputText: event.target.value });
  };

  onResize = () => {
    if (!isUndefined(this.props.plainDiff)) {
      for (const comment of this.props.plainDiff.plainDiff.state.comments) {
        comment.toggleUpdate();
      }
    }
  };

  async handleSubmit() {
    const _thread = this.props.thread;
    let payload;
    if (!isNull(this.state.thread.comment)) {
      payload = _thread.getCommentReplyBody(this.state.inputText);
    } else {
      payload = _thread.getCommentNewBody(this.state.inputText);
    }
    await _thread.postComment(payload);
    this.setState({ thread: _thread, isInput: false });
    this.setState({ inputText: '' });
  }

  handleCancel() {
    // If no other comments, canceling should remove this thread
    if (isNull(this.state.thread.comment)) {
      this.props.handleRemove(); // for component specific remove methods
    } else {
      this.setState({ isInput: false });
    }
  }

  getCommentItemDom(item: IPullRequestCommentModel) {
    return (
      <div className="jp-PullRequestCommentItem">
        <div className="jp-PullRequestCommentItemImg">
          <img src={item.userpic}></img>
        </div>
        <div className="jp-PullRequestCommentItemContent">
          <div className="jp-PullRequestCommentItemContentTitle">
            <h2>{item.username}</h2>
            <p>{moment(item.updatedAt).fromNow()}</p>
          </div>
          <p>{item.text}</p>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="jp-PullRequestComment">
        <div className="jp-PullRequestCommentHeader">
          {!this.state.isExpanded && !isNull(this.state.thread.comment) && (
            <p>
              {this.state.thread.comment.username}:{' '}
              {this.state.thread.comment.text}
            </p>
          )}
          <span
            className={
              'jp-Icon jp-Icon-20 ' +
              (this.state.isExpanded ? 'jp-CaretUp-icon' : 'jp-CaretDown-icon')
            }
            onClick={() =>
              this.setState({ isExpanded: !this.state.isExpanded })
            }
          />
        </div>
        {this.state.isExpanded && (
          <div>
            {!isNull(this.state.thread.comment) && (
              <div>
                {this.getCommentItemDom(this.state.thread.comment)}
                <div>
                  {this.state.thread.replies.map((reply, i) => (
                    <div key={i}>{this.getCommentItemDom(reply)}</div>
                  ))}
                </div>
              </div>
            )}
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
                      disabled={this.state.inputText === ''}
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
                <button
                  onClick={() => this.setState({ isInput: true })}
                  className="jp-PullRequestInputForm jp-PullRequestInputFormButton"
                >
                  Reply...
                </button>
              )}
            </div>
          </div>
        )}
        <ReactResizeDetector handleHeight={true} onResize={this.onResize} />
      </div>
    );
  }
}
