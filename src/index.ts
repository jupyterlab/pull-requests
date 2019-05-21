import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import '../style/index.css';


/**
 * Initialization data for the jupyterlab-pullrequests extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab-pullrequests',
  autoStart: true,
  activate: (app: JupyterLab) => {
    console.log('JupyterLab extension jupyterlab-pullrequests is activated!');
  }
};

export default extension;
