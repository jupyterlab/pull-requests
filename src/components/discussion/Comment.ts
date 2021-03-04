import { IRenderMime, IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Widget } from '@lumino/widgets';
import moment from 'moment';
import { IComment } from '../../tokens';
import { generateNode } from '../../utils';

/**
 * CommentWidget properties
 */
export interface ICommentWidgetProps {
  /**
   * Comment to be displayed
   */
  comment: IComment;
  /**
   * Rendermime registry
   */
  renderMime: IRenderMimeRegistry;
}

/**
 * Comment widget
 */
export class CommentWidget extends Widget {
  constructor(props: ICommentWidgetProps) {
    const { comment, renderMime } = props;
    const markdownRenderer = renderMime.createRenderer('text/markdown');
    super({
      node: CommentWidget.createNode(comment, markdownRenderer)
    });
    this._markdownRenderer = markdownRenderer;
    this._markdownRenderer.renderModel({
      data: {
        'text/markdown': comment.text
      },
      trusted: false,
      metadata: {},
      setData: () => null
    });
  }

  /**
   * Create the HTML nodes
   *
   * @param comment Comment to be displayed
   * @param markdownRenderer Markdown renderer
   */
  protected static createNode(
    comment: IComment,
    markdownRenderer: IRenderMime.IRenderer
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
      generateNode('p', { class: 'jp-PullRequestCommentItemContentTitle' })
    );
    div.appendChild(generateNode('strong', null, comment.userName));
    div.appendChild(
      generateNode(
        'span',
        {
          class: 'jp-PullRequestGrayedText',
          title: new Date(comment.updatedAt).toString()
        },
        moment(comment.updatedAt).fromNow()
      )
    );

    // Add rendered comment
    content.appendChild(markdownRenderer.node);

    return head;
  }

  /**
   * Dispose the widget
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._markdownRenderer.dispose();
    super.dispose();
  }

  protected _markdownRenderer: IRenderMime.IRenderer;
}
