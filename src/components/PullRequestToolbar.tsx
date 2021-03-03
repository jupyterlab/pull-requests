import React from 'react';
import { refreshIcon } from '@jupyterlab/ui-components';
import { ActionButton } from '@jupyterlab/git/lib/components/ActionButton';

/**
 * PullRequestToolbar properties
 */
export interface IPullRequestToolbarProps {
  /**
   * Refresh button callback
   */
  onRefresh: () => void;
}

/**
 * PullRequestToolbar component
 *
 * @param props Component properties
 */
export function PullRequestToolbar(
  props: IPullRequestToolbarProps
): JSX.Element {
  return (
    <div className="lm-Widget jp-Toolbar jp-scrollbar-tiny jp-PullRequestToolbar">
      <div className="jp-PullRequestToolbarHeader">
        <h2>Pull Requests</h2>
      </div>
      <div className="jp-PullRequestToolbarItem">
        <ActionButton
          icon={refreshIcon}
          title="Refresh"
          onClick={props.onRefresh}
        />
      </div>
    </div>
  );
}
