import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Widget } from '@lumino/widgets';
import { PullRequestModel } from '../../models';

export interface IPullRequestDescriptionTabProps {
  pr: PullRequestModel;
  renderMimeRegistry: IRenderMimeRegistry;
}

export class PullRequestDescriptionTab extends Widget {
  constructor(props: IPullRequestDescriptionTabProps) {
    const markdownRenderer = props.renderMimeRegistry.createRenderer(
      'text/markdown'
    );

    super({
      node: PullRequestDescriptionTab.create(
        props.pr.title,
        props.pr.link,
        markdownRenderer
      )
    });

    markdownRenderer.renderModel({
      data: {
        'text/markdown': props.pr.body
      },
      trusted: false,
      metadata: {},
      setData: () => null
    });
  }

  private static create(
    title: string,
    link: string,
    descriptionWidget: Widget
  ): HTMLDivElement {
    const div1 = document.createElement('div');
    div1.classList.add('jp-PullRequestTab');
    const div2 = document.createElement('div');
    div2.classList.add('jp-PullRequestDescriptionTab');
    const h1 = document.createElement('h1');
    h1.textContent = title;
    const button = document.createElement('button');
    button.classList.add('jp-Button-flat', 'jp-mod-styled', 'jp-mod-accept');
    button.addEventListener('click', (): void => {
      window.open(link, '_blank');
    });
    button.textContent = 'View Details';
    div2.append(h1);
    div2.append(descriptionWidget.node);
    div2.append(button);
    div1.append(div2);

    return div1;
  }
}
