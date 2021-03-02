import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Panel, Widget } from '@lumino/widgets';
import { IComment, IPullRequest, IThread } from '../../tokens';
import { generateNode, requestAPI } from '../../utils';
import { CommentThread } from '../diff/CommentThread';

export interface IPullRequestDescriptionTabProps {
  /**
   * Pull Request data
   */
  pullRequest: IPullRequest;
  /**
   * Render mime type registry
   */
  renderMime: IRenderMimeRegistry;
}

export class PullRequestDescriptionTab extends Panel {
  constructor(props: IPullRequestDescriptionTabProps) {
    super();
    this.pullRequestId = props.pullRequest.id;
    this.renderMime = props.renderMime;
    this.addClass('jp-PullRequestTab');

    const header = PullRequestDescriptionTab.createHeader(
      props.pullRequest.title,
      props.pullRequest.link
    );
    this.addWidget(
      new Widget({
        node: header
      })
    );

    const markdownRenderer = props.renderMime.createRenderer('text/markdown');
    this.addWidget(markdownRenderer);
    markdownRenderer
      .renderModel({
        data: {
          'text/markdown': props.pullRequest.body
        },
        trusted: false,
        metadata: {},
        setData: () => null
      })
      .catch(reason => {
        console.error('Failed to render pull request description.', reason);
      });

    this.loadComments(props.pullRequest.id, props.renderMime);
  }

  protected loadComments(prId: string, renderMime: IRenderMimeRegistry): void {
    requestAPI<IThread[]>(
      `pullrequests/files/comments?id=${encodeURIComponent(prId)}`,
      'GET'
    )
      .then(threads => {
        this.threads = threads;

        threads.forEach(thread => {
          const widget = new CommentThread({
            renderMime,
            thread,
            handleRemove: (): void => null
          });
          this.addWidget(widget);
        });

        this.addNewThreadButton();
      })
      .catch(reason => {
        console.error(reason);
        this.addNewThreadButton();
      });
  }

  private static createHeader(title: string, link: string): HTMLElement {
    const div = generateNode('div', { class: 'jp-PullRequestDescriptionTab' });
    div.appendChild(generateNode('h1', {}, title));
    div.appendChild(
      generateNode(
        'button',
        { class: 'jp-Button-flat jp-mod-styled jp-mod-accept' },
        'View Details',
        {
          click: (): void => {
            window.open(link, '_blank');
          }
        }
      )
    );

    return div;
  }

  private addNewThreadButton(): void {
    const node = generateNode('div', { class: 'jp-PullRequestThread' });
    node
      .appendChild(generateNode('div', { class: 'jp-PullRequestCommentItem' }))
      .appendChild(
        generateNode('div', { class: 'jp-PullRequestCommentItemContent' })
      )
      .appendChild(
        generateNode(
          'button',
          { class: 'jp-PullRequestReplyButton jp-PullRequestGrayedText' },
          'Start a new discussion',
          {
            click: () => {
              // Append an empty thread to start a new discussion
              const hasNewThread =
                this.threads[this.threads.length - 1]?.comments.length === 0;
              if (!hasNewThread) {
                const thread: IThread = {
                  comments: new Array<IComment>(),
                  pullRequestId: this.pullRequestId
                };

                this.threads.push(thread);

                const widget = new CommentThread({
                  thread,
                  renderMime: this.renderMime,
                  handleRemove: (): void => {
                    const threadIndex = this.threads.findIndex(
                      thread_ => thread.id === thread_.id
                    );
                    this.threads.splice(threadIndex, 1);
                    widget.parent = null;
                    widget.dispose();
                  }
                });

                this.insertWidget(this.widgets.length - 1, widget);
              }
            }
          }
        )
      );
    this.addWidget(new Widget({ node }));
  }

  protected pullRequestId: string;
  protected renderMime: IRenderMimeRegistry;
  protected threads: IThread[];
}
