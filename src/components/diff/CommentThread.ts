import { Widget } from '@lumino/widgets';
import { IComment, IThread } from '../../tokens';
import moment from 'moment';
import { generateNode, requestAPI } from '../../utils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { caretDownIcon, caretUpIcon } from '@jupyterlab/ui-components';
import { InputComment } from './InputComment';
import { showErrorMessage } from '@jupyterlab/apputils';

/**
 * CommentThread widget properties
 */
export interface ICommentThreadProps {
  /**
   * RenderMime registry
   */
  renderMime: IRenderMimeRegistry;
  /**
   * Thread to be displayed
   */
  thread: IThread;
  /**
   * Callback when the thread is removed
   */
  handleRemove: () => void;
}

/**
 * CommentThread widget
 */
export class CommentThread extends Widget {
  constructor(props: ICommentThreadProps) {
    super();
    this.addClass('jp-PullRequestCommentItem');
    this._handleRemove = props.handleRemove;
    this._inputShown = props.thread.comments.length === 0;
    this._thread = props.thread;
    this._renderMime = props.renderMime;

    this.initNode();
  }

  /**
   * Is the thread expanded?
   */
  get isExpanded(): boolean {
    return this._isExpanded;
  }
  set isExpanded(v: boolean) {
    if (this._isExpanded !== v) {
      this._isExpanded = v;
      if (this._isExpanded) {
        this.addThreadView();
      } else {
        this._threadsContainer.textContent = '';
        this._threadsContainer.appendChild(
          generateNode(
            'p',
            null,
            `${this._thread.comments[0].userName} ${this._thread.comments[0].text}`
          )
        );
      }
    }
  }

  /**
   * Is the input comment widget shown?
   */
  get inputShown(): boolean {
    return this._inputShown;
  }
  set inputShown(v: boolean) {
    if (this._inputShown !== v) {
      this._inputShown = v;
      this._threadsContainer.replaceChild(
        this._inputShown ? this.createCommentInput() : this.createReplyButton(),
        this._threadsContainer.lastChild
      );
    }
  }

  /**
   * Create a comment HTML view
   *
   * @param comment Comment
   * @param renderMime Rendermime registry
   * @returns The HTML element
   */
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

  /**
   * Initialize the widget node
   */
  protected initNode(): void {
    const expandButton = generateNode('button') as HTMLButtonElement;
    this.node
      .appendChild(expandButton)
      .appendChild(caretUpIcon.element({ tag: 'span' }));

    this._threadsContainer = generateNode('div', {
      class: 'jp-PullRequestComments'
    }) as HTMLDivElement;

    this.node.appendChild(this._threadsContainer);
    this.addThreadView();

    // Add event
    expandButton.addEventListener('click', () => {
      expandButton.replaceChild(
        this.isExpanded
          ? caretDownIcon.element({ tag: 'span' })
          : caretUpIcon.element({ tag: 'span' }),
        expandButton.firstChild
      );
      this.isExpanded = !this.isExpanded;
    });
  }

  /**
   * Add the thread view in the widget
   */
  protected addThreadView(): void {
    this._threadsContainer.textContent = '';
    this._thread.comments.forEach(comment => {
      this._threadsContainer.appendChild(
        CommentThread.createCommentNode(comment, this._renderMime)
      );
    });
    if (this._inputShown) {
      this._threadsContainer.appendChild(this.createCommentInput());
    } else {
      this._threadsContainer.appendChild(this.createReplyButton());
    }
  }

  /**
   * Handle new comment submission
   *
   * @param comment Comment text
   */
  protected async handleAddComment(text: string): Promise<void> {
    let body: object = { text };
    if (this._thread.comments.length === 0) {
      body = {
        ...body,
        line: this._thread.line,
        originalLine: this._thread.originalLine
      };
    } else {
      body = { ...body, discussionId: this._thread.id };
    }
    let endpoint = `pullrequests/files/comments?id=${encodeURIComponent(
      this._thread.pullRequestId
    )}`;
    if (this._thread.filename) {
      endpoint += `&filename=${encodeURIComponent(this._thread.filename)}`;
    }
    try {
      const response = await requestAPI<any>(endpoint, 'POST', body);

      const comment: IComment = {
        id: response.id,
        text: response.text,
        updatedAt: response.updateAt,
        userName: response.userName,
        userPicture: response.userPicture
      };
      this._thread.comments.push(comment);

      this._threadsContainer.replaceChild(
        CommentThread.createCommentNode(comment, this._renderMime),
        this._threadsContainer.lastChild
      );
      this._inputShown = false;
      this._threadsContainer.appendChild(this.createReplyButton());
    } catch (reason) {
      console.error(reason);
      showErrorMessage('Error', 'Failed to add the comment.');
    }
  }

  /**
   * Handle cancel event
   *
   * If the thread has no comment, this results in its removal.
   */
  protected handleCancelComment(): void {
    if (this._thread.comments.length === 0) {
      this._handleRemove();
    } else {
      this.inputShown = false;
    }
  }

  private createCommentInput(): HTMLElement {
    return new InputComment({
      handleSubmit: this.handleAddComment.bind(this),
      handleCancel: this.handleCancelComment.bind(this)
    }).node;
  }

  private createReplyButton(): HTMLElement {
    return generateNode('button', { class: '' }, 'Reply...', {
      click: () => {
        this.inputShown = true;
      }
    });
  }

  private _handleRemove: () => void;
  private _inputShown: boolean;
  private _isExpanded = true;
  private _renderMime: IRenderMimeRegistry;
  private _thread: IThread;
  private _threadsContainer: HTMLDivElement;
}
