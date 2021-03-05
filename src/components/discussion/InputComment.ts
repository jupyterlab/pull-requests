import { Widget } from '@lumino/widgets';
import CodeMirror from 'codemirror';

import { generateNode } from '../../utils';

import 'codemirror/addon/display/placeholder.js';

/**
 * InputComment widget properties
 */
export interface IInputCommentProps {
  /**
   * Callback to comment submission
   */
  handleSubmit: (comment: string) => void;
  /**
   * Callback to comment cancellation
   */
  handleCancel: () => void;
}

/**
 * InputComment widget
 */
export class InputComment extends Widget {
  constructor(props: IInputCommentProps) {
    super();
    this.addClass('jp-PullRequestInputContainer');
    this.initNode();

    this._handleSubmit = props.handleSubmit;
    this._handleRemove = props.handleCancel;
  }

  /**
   * Comment
   */
  get comment(): string {
    return this._comment;
  }
  set comment(v: string) {
    if (this._comment !== v) {
      this._comment = v;
      const button = this.node.getElementsByClassName(
        'jp-PullRequest-CommentButton'
      )[0] as HTMLButtonElement;
      button.disabled = this._comment === '';
    }
  }

  /**
   * Handle click event on cancel button
   *
   * @param event Click event
   */
  protected handleCancel(event: Event): void {
    this._handleRemove();
  }

  /**
   * Handle comment input event
   *
   * @param event Input event
   */
  protected handleInputChange(editor: CodeMirror.Editor): void {
    this.comment = editor.getValue();
  }

  /**
   * Handle click event on add comment button
   *
   * @param event Click event
   */
  protected handleSubmit(event: Event): void {
    if (this._comment) {
      this._handleSubmit(this._comment);
    }
  }

  /**
   * Initialize the widget HTML node
   */
  protected initNode(): void {
    const buttonsContainer = generateNode('div', {
      class: 'jp-PullRequestInputButtonContainer'
    });

    buttonsContainer.appendChild(
      generateNode(
        'button',
        {
          class: 'jp-Button-flat jp-mod-styled jp-mod-reject'
        },
        'Cancel',
        {
          click: this.handleCancel.bind(this)
        }
      )
    );

    buttonsContainer.appendChild(
      generateNode(
        'button',
        {
          class:
            'jp-Button-flat jp-PullRequest-CommentButton jp-mod-styled jp-mod-accept',
          disabled: true
        },
        'Comment',
        {
          click: this.handleSubmit.bind(this)
        }
      )
    );

    const head = this.node.appendChild(
      generateNode('div', { class: 'jp-PullRequestCommentItemContent' })
    );
    const editor = head.appendChild(
      generateNode('textarea', {
        class: 'jp-PullRequestInputForm jp-PullRequestInputFormTextArea',
        placeholder: 'Leave a comment',
        value: ''
      })
    ) as HTMLTextAreaElement;
    const cm = CodeMirror.fromTextArea(editor, {
      mode: 'markdown',
      theme: 'jupyter',
      lineWrapping: true
    });
    cm.on('change', this.handleInputChange.bind(this));

    head.appendChild(buttonsContainer);
  }

  private _handleRemove: () => void;
  private _handleSubmit: (comment: string) => void;
  private _comment = '';
}
