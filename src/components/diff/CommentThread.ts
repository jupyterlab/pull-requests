import { Widget } from '@lumino/widgets';
import { IComment, IThread } from '../../tokens';
import moment from 'moment';
import { generateNode } from '../../utils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { caretUpIcon } from '@jupyterlab/ui-components';

export interface ICommentThreadProps {
  renderMime: IRenderMimeRegistry;
  thread: IThread;
  handleRemove: () => void;
  handleAddComment: (comment: IComment) => void;
}

export class CommentThread extends Widget {
  constructor(props: ICommentThreadProps) {
    super({ node: CommentThread.createNode(props.thread, props.renderMime) });

    // Add event
    // const buttons = this.node.getElementsByTagName('button');
    // buttons[0].addEventListener('click', () => {
    //   this.isExpanded = !this.isExpanded;
    // });

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

  protected static createCommentNode(
    comment: IComment,
    renderMime: IRenderMimeRegistry
  ): HTMLElement {
    const head = generateNode('div', { class: 'jp-PullRequestCommentItem' });
    head
      .appendChild(
        generateNode('div', { class: 'jp-PullRequestCommentItemImg' })
      )
      .appendChild(
        generateNode('img', { src: comment.userPicture, altText: 'Avatar' })
      );
    const content = head.appendChild(
      generateNode('div', { class: 'jp-PullRequestCommentItemContent' })
    );
    const div = content.appendChild(
      generateNode('div', { class: 'jp-PullRequestCommentItemContentTitle' })
    );
    div.appendChild(generateNode('h2', null, comment.userName));
    div.appendChild(
      generateNode(
        'p',
        { title: new Date(comment.updatedAt).toString() },
        moment(comment.updatedAt).fromNow()
      )
    );

    // Add rendered comment
    const markdownRenderer = renderMime.createRenderer('text/markdown');
    content.appendChild(markdownRenderer.node);
    markdownRenderer.renderModel({
      data: {
        'text/markdown': comment.text
      },
      trusted: false,
      metadata: {},
      setData: () => null
    });

    return head;
  }

  protected static createNode(
    thread: IThread,
    renderMime: IRenderMimeRegistry
  ): HTMLElement {
    const div = generateNode('div', { class: 'jp-PullRequestComment' });
    div
      .appendChild(
        generateNode('div', {
          class: 'jp-PullRequestCommentHeader'
        })
      )
      .appendChild(generateNode('button'))
      .appendChild(caretUpIcon.element({ tag: 'span' }));

    const commentContainer = div.appendChild(generateNode('div'));

    thread.comments.forEach(comment => {
      commentContainer.appendChild(
        CommentThread.createCommentNode(comment, renderMime)
      );
    });
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
      class="jp-PullRequestInputForm jp-PullRequestInputFormTextArea"
      placeholder="Leave a comment"
      value=""
    />
    <div class="jp-PullRequestInputButtonContainer">
      <button
        class="jp-Button-flat jp-mod-styled jp-mod-reject"
      >
        Cancel
      </button>
      <button
        disabled=true
        class="jp-PullRequest-CommentButton jp-Button-flat jp-mod-styled jp-mod-accept"
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
  private _isExpanded = true;
  private _thread: IThread;
}
