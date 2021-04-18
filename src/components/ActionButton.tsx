import { LabIcon } from '@jupyterlab/ui-components';
import * as React from 'react';

/**
 * Action button properties interface
 */
export interface IActionButtonProps {
  /**
   * Is disabled?
   */
  disabled?: boolean;
  /**
   * Icon
   */
  icon: LabIcon;
  /**
   * Button title
   */
  title: string;
  /**
   * On-click event handler
   */
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Action button component
 *
 * @param props Component properties
 */
export function ActionButton(props: IActionButtonProps): JSX.Element {
  const { disabled, title, onClick, icon } = props;
  return (
    <button
      disabled={disabled}
      className={'jp-PullRequestButton'}
      title={title}
      onClick={onClick}
    >
      <icon.react elementPosition="center" tag="span" />
    </button>
  );
}
