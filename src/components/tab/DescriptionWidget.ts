import { MainAreaWidget } from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Panel, Widget } from '@lumino/widgets';
import { PromiseDelegate } from '@lumino/coreutils';
import { IComment, IPullRequest, IThread } from '../../tokens';
import { generateNode, requestAPI } from '../../utils';
import { Discussion } from '../discussion/Discussion';

/**
 * DescriptionWidget properties
 */
export interface IDescriptionWidgetProps {
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
 * DescriptionWidget component
 */
export class DescriptionWidget extends MainAreaWidget<Panel> {
  constructor(props: IDescriptionWidgetProps) {
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
      DescriptionWidget.createHeader(
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

  /**
   * Load the discussion of the pull request
   *
   * @param container Discussion widgets container
   * @param pullRequestId Pull request id
   * @param renderMime Rendermime registry
   */
  protected async loadComments(
    container: Panel,
    pullRequestId: string,
    renderMime: IRenderMimeRegistry
  ): Promise<void> {
    return await requestAPI<IThread[]>(
      `pullrequests/files/comments?id=${encodeURIComponent(pullRequestId)}`,
      'GET'
    )
      .then(threads => {
        this.threads = threads;

        threads.forEach(thread => {
          const widget = new Discussion({
            renderMime,
            thread,
            handleRemove: (): void => null
          });
          container.addWidget(widget);
        });

        container.addWidget(this.createNewThreadButton(container));

        return Promise.resolve();
      })
      .catch(reason => {
        container.addWidget(this.createNewThreadButton(container));
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

  private createNewThreadButton(container: Panel): Widget {
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

                const widget = new Discussion({
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

                container.insertWidget(container.widgets.length - 1, widget);
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
