import React from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  IThemeManager,
  MainAreaWidget,
  ReactWidget,
  Toolbar
} from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { PanelLayout, Widget } from '@lumino/widgets';
import { PullRequestFileModel, PullRequestModel } from '../models';
import { PullRequestBrowser } from './browser/PullRequestBrowser';
import { PullRequestToolbar } from './PullRequestToolbar';
import { PullRequestTabWidget } from './tab/PullRequestTabWidget';
import { PullRequestDescriptionTab } from './tab/PullRequestDescriptionTab';

export class PullRequestPanel extends Widget {
  private _app: JupyterFrontEnd;
  private _themeManager: IThemeManager;
  private _renderMime: IRenderMimeRegistry;
  private _toolbar: Toolbar;
  private _browser: Widget;
  private _tabs: Widget[];

  constructor(
    app: JupyterFrontEnd,
    themeManager: IThemeManager,
    renderMime: IRenderMimeRegistry
  ) {
    super();
    this.addClass('jp-PullRequestPanel');
    this.layout = new PanelLayout();

    this._app = app;
    this._themeManager = themeManager;
    this._renderMime = renderMime;
    this._tabs = [];
    this._browser = ReactWidget.create(
      <PullRequestBrowser showTab={this.showTab.bind(this)} />
    );
    this._toolbar = new PullRequestToolbar(this.update.bind(this));

    (this.layout as PanelLayout).addWidget(this._toolbar);
    this._toolbar.activate();
    (this.layout as PanelLayout).addWidget(this._browser);
  }

  // Show tab window for specific PR
  // FIXME transform to command
  showTab = async (
    data: PullRequestFileModel | PullRequestModel
  ): Promise<void> => {
    let tab = this.getTab(data.id);
    if (tab === null) {
      if (data instanceof PullRequestFileModel) {
        tab = new MainAreaWidget<PullRequestTabWidget>({
          content: new PullRequestTabWidget(
            data,
            this._themeManager,
            this._renderMime
          )
        });
        tab.title.label = data.name;
      } else {
        tab = new MainAreaWidget<PullRequestDescriptionTab>({
          content: new PullRequestDescriptionTab({
            pr: data,
            renderMimeRegistry: this._renderMime
          })
        });
        tab.title.label = data.title;
      }
      tab.id = data.id;
      this._tabs.push(tab);
    }
    if (!tab.isAttached) {
      this._app.shell.add(tab, 'main');
    }
    tab.update();
    this._app.shell.activateById(tab.id);
  };

  private getTab(id: string): Widget | null {
    for (const tab of this._tabs) {
      if (tab.id.toString() === id.toString()) {
        return tab;
      }
    }
    return null;
  }

  getApp() {
    return this._app;
  }

  onUpdateRequest(): void {
    // FIXME - it is not working as expected
    this._browser.update();
    for (const tab of this._tabs) {
      tab.update();
    }
  }
}
