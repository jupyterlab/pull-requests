import { MainAreaWidget } from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Panel, Widget } from '@lumino/widgets';
import { PromiseDelegate } from '@lumino/coreutils';
import { IComment, IPullRequest, IThread } from '../../tokens';
import { generateNode, requestAPI } from '../../utils';
import { CommentThread } from '../diff/CommentThread';

/**
 * PullRequestDescriptionTab properties
 */
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

/**
 * PullRequestDescriptionTab component
 */
export class PullRequestDescriptionTab extends MainAreaWidget<Panel> {
  constructor(props: IPullRequestDescriptionTabProps) {
    const content = new Panel();
    const isLoaded = new PromiseDelegate<void>();
    super({
      content,
      reveal: isLoaded.promise
    });
    this.pullRequestId = props.pullRequest.id;
    this.renderMime = props.renderMime;
    content.addClass('jp-PullRequestTab');

    const container = new Panel();
    container.addClass('jp-PullRequestDescriptionTab');

    container.addWidget(
      PullRequestDescriptionTab.createHeader(
        props.pullRequest.title,
        props.pullRequest.link
      )
    );

    const markdownRenderer = props.renderMime.createRenderer('text/markdown');
    container.addWidget(markdownRenderer);

    Promise.all([
      markdownRenderer.renderModel({
        data: {
          'text/markdown': props.pullRequest.body
        },
        trusted: false,
        metadata: {},
        setData: () => null
      }),
      this.loadComments(container, props.pullRequest.id, props.renderMime)
    ])
      .then(() => {
        isLoaded.resolve();
        this.content.addWidget(container);
      })
      .catch(reason => {
        isLoaded.reject(reason);
      });
  }

  protected async loadComments(
    container: Panel,
    prId: string,
    renderMime: IRenderMimeRegistry
  ): Promise<void> {
    return await requestAPI<IThread[]>(
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
          container.addWidget(widget);
        });

        container.addWidget(this.createNewThreadButton());

        return Promise.resolve();
      })
      .catch(reason => {
        container.addWidget(this.createNewThreadButton());
        return Promise.reject(reason);
      });
  }

  private static createHeader(title: string, link: string): Widget {
    const node = generateNode('div', {
      class: 'jp-PullRequestDescriptionHeader'
    });
    node.appendChild(generateNode('h1', {}, title));
    node.appendChild(
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

    return new Widget({
      node
    });
  }

  private createNewThreadButton(): Widget {
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

                this.content.insertWidget(
                  this.content.widgets.length - 1,
                  widget
                );
              }
            }
          }
        )
      );
    return new Widget({ node });
  }

  protected pullRequestId: string;
  protected renderMime: IRenderMimeRegistry;
  protected threads: IThread[];
}
