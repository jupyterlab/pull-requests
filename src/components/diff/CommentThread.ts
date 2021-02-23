import { Widget } from '@lumino/widgets';
import { IComment, IThread } from '../../tokens';
import moment from 'moment';

export interface ICommentThreadProps {
  thread: IThread;
  handleRemove: () => void;
  handleAddComment: (comment: IComment) => void;
}

export class CommentThread extends Widget {
  constructor(props: ICommentThreadProps) {
    super({ node: CommentThread.createNode() });

    // Add event
    const buttons = this.node.getElementsByTagName('button');
    buttons[0].addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
    });

    // this._handleAddComment = props.handleAddComment;
    // this._handleRemove = props.handleRemove;
    this._thread = props.thread;
  }

  get inputText(): string {
    return this._inputText;
  }
  set inputText(v: string) {
    this._inputText = v;
  }

  get isExpanded(): boolean {
    return this._isExpanded;
  }
  set isExpanded(v: boolean) {
    this._isExpanded = v;
    if (this._isExpanded !== v) {
      const header = this.node.getElementsByClassName(
        'jp-PullRequestCommentHeader'
      )[0];
      // Clean up
      const ps = header.getElementsByTagName('p');
      for (const p of ps) {
        p.remove();
      }
      if (this._thread.comments.length > 0) {
        const firstComment = this._thread.comments[0];
        const p = document.createElement('p');
        p.innerText = `${firstComment.userName}: ${firstComment.text}`;
        header.prepend(p);
      }
    }
  }

  get inputShown(): boolean {
    return this._inputShown;
  }
  set inputShown(v: boolean) {
    if (this._inputShown === v) {
      this._inputShown = v;
    }
  }

  protected static createCommentNode(comment: IComment): string {
    return `<div className="jp-PullRequestCommentItem">
    <div className="jp-PullRequestCommentItemImg">
      <img src=${comment.userPic}></img>
    </div>
    <div className="jp-PullRequestCommentItemContent">
      <div className="jp-PullRequestCommentItemContentTitle">
        <h2>${comment.userName}</h2>
        <p>${moment(comment.updatedAt).fromNow()}</p>
      </div>
      <p>${comment.text}</p>
    </div>
  </div>`;
  }

  protected static createNode(): HTMLDivElement {
    const div = document.createElement('div');
    div.innerHTML = `<div className="jp-PullRequestComment">
    <div className="jp-PullRequestCommentHeader">
      <button></button>
    </div>
  </div>`;
    return div;
  }

  protected static insertInputNode(
    container: HTMLElement,
    onCommentChanged: (event: Event) => void,
    onCancel: () => void,
    onSubmit: () => void
  ): void {
    // Clean up
    for (const child of container.children) {
      child.remove();
    }

    container.innerHTML = `<textarea
      className="jp-PullRequestInputForm jp-PullRequestInputFormTextArea"
      placeholder="Leave a comment"
      value=""
    />
    <div className="jp-PullRequestInputButtonContainer">
      <button
        className="jp-Button-flat jp-mod-styled jp-mod-reject"
      >
        Cancel
      </button>
      <button
        disabled=true
        className="jp-PullRequest-CommentButton jp-Button-flat jp-mod-styled jp-mod-accept"
      >
        Comment
      </button>
    </div>`;

    // Add events
    container
      .getElementsByTagName('textarea')[0]
      .addEventListener('change', onCommentChanged);

    const buttons = container.getElementsByTagName('button');
    const actions = [onSubmit, onCancel];
    for (const button of buttons) {
      button.addEventListener('click', actions.pop());
    }
  }

  // private _handleRemove: () => void;
  // private _handleAddComment: (comment: IComment) => void;
  private _inputShown: boolean;
  private _inputText: string;
  private _isExpanded: boolean;
  private _thread: IThread;
}
