import { Panel, Widget } from '@lumino/widgets';
import { IComment, IThread } from '../../tokens';
import { generateNode, requestAPI } from '../../utils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { caretDownIcon, caretUpIcon } from '@jupyterlab/ui-components';
import { InputComment } from './InputComment';
import { showErrorMessage } from '@jupyterlab/apputils';
import { CommentWidget } from './Comment';

/**
 * Discussion widget properties
 */
export interface IDiscussionProps {
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
 * Discussion widget
 */
export class Discussion extends Panel {
  constructor(props: IDiscussionProps) {
    super();
    this.addClass('jp-PullRequestThread');
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
      // Keep the first widget aka the expand button
      while (this.widgets.length > 1) {
        const latestWidget = this.widgets[this.widgets.length - 1];
        latestWidget.parent = null;
        latestWidget.dispose();
      }
      if (this._isExpanded) {
        this.addThreadView();
      } else {
        const msg = this._thread.comments[0]
          ? `<strong>${this._thread.comments[0].userName}</strong> ${this._thread.comments[0].text}`
          : 'Leave a comment';

        const node = generateNode('div', {
          class: 'jp-PullRequestCommentItem'
        });
        const p = node
          .appendChild(
            generateNode('div', { class: 'jp-PullRequestCommentItemContent' })
          )
          .appendChild(
            generateNode('p', {
              class: 'jp-PullRequestCommentItemContentTitle'
            })
          );
        p.innerHTML = msg;
        this.addWidget(new Widget({ node }));
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

      const latestWidget = this.widgets[this.widgets.length - 1];
      latestWidget.parent = null;
      latestWidget.dispose();

      if (this._inputShown) {
        this.addWidget(this.createCommentInput());
      } else if (this._thread.singleton !== true) {
        this.addWidget(this.createReplyButton());
      }
    }
  }

  /**
   * Initialize the widget node
   */
  protected initNode(): void {
    const expandButton = generateNode('button', {
      class: 'jp-PullRequestExpandButton'
    }) as HTMLButtonElement;
    expandButton.appendChild(
      caretUpIcon.element({ tag: 'span', title: 'Collapse Discussion' })
    );
    this.addWidget(new Widget({ node: expandButton }));

    this.addThreadView();

    // Add event
    expandButton.addEventListener('click', () => {
      expandButton.replaceChild(
        this.isExpanded
          ? caretDownIcon.element({ tag: 'span' })
          : caretUpIcon.element({ tag: 'span' }),
        expandButton.firstChild
      );
      expandButton.title = this.isExpanded
        ? 'Expand Discussion'
        : 'Collapse Discussion';
      this.isExpanded = !this.isExpanded;
    });
  }

  /**
   * Add the thread view in the widget
   */
  protected addThreadView(): void {
    this._thread.comments.forEach(comment => {
      this.addWidget(
        new CommentWidget({ comment, renderMime: this._renderMime })
      );
    });
    if (this._inputShown) {
      this.addWidget(this.createCommentInput());
    } else {
      if (this._thread.singleton !== true) {
        this.addWidget(this.createReplyButton());
      }
    }
  }

  /**
   * Handle new comment submission
   *
   * @param comment Comment text
   */
  protected async handleAddComment(text: string): Promise<void> {
    let body: { [k: string]: string | number } = { text };
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
      // Update discussion reference
      if (response.inReplyTo) {
        this._thread.id = response.inReplyTo;
      }
      this._thread.comments.push(comment);

      const latestWidget = this.widgets[this.widgets.length - 1];
      latestWidget.parent = null;
      latestWidget.dispose();

      this.addWidget(
        new CommentWidget({ comment, renderMime: this._renderMime })
      );
      this._inputShown = false;
      this.addWidget(this.createReplyButton());
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

  private createCommentInput(): InputComment {
    const widget = new InputComment({
      handleSubmit: this.handleAddComment.bind(this),
      handleCancel: this.handleCancelComment.bind(this)
    });
    widget.addClass('jp-PullRequestCommentItem');
    return widget;
  }

  private createReplyButton(): Widget {
    const node = generateNode('div', { class: 'jp-PullRequestCommentItem' });
    node
      .appendChild(
        generateNode('div', { class: 'jp-PullRequestCommentItemContent' })
      )
      .appendChild(
        generateNode(
          'button',
          { class: 'jp-PullRequestReplyButton jp-PullRequestGrayedText' },
          'Reply...',
          {
            click: () => {
              this.inputShown = true;
            }
          }
        )
      );
    return new Widget({
      node
    });
  }

  private _handleRemove: () => void;
  private _inputShown: boolean;
  private _isExpanded = true;
  private _renderMime: IRenderMimeRegistry;
  private _thread: IThread;
}
