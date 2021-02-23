import React from 'react';
import { refreshIcon } from '@jupyterlab/ui-components';
import { ActionButton } from '@jupyterlab/git/lib/components/ActionButton';

export interface IPullRequestToolbarProps {
  /**
   * Refresh button callback
   */
  onRefresh: () => void;
}

export function PullRequestToolbar(
  props: IPullRequestToolbarProps
): JSX.Element {
  return (
    <div className="lm-Widget jp-Toolbar jp-scrollbar-tiny jp-PullRequestToolbar">
      <h2>Pull Requests</h2>
      <span className="jp-pullrequest-space"></span>
      <ActionButton
        icon={refreshIcon}
        title="Refresh"
        onClick={props.onRefresh}
      />
    </div>
  );
}
