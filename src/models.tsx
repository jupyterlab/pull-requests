import { uniqueId } from 'lodash';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { PullRequestCommentThread } from './components/diff/PullRequestCommentThread';
import { PlainDiffComponent } from './components/diff/PlainDiffComponent';
import { requestAPI } from './utils';
import { IComment } from './tokens';

// -----------------------------------------------------------------------------
// File Model
// -----------------------------------------------------------------------------

export class PullRequestFileModel {
  constructor(
    uid: string,
    name: string,
    status: string,
    fileType: DocumentRegistry.IFileType,
    prID: string
  ) {
    this.fileType = fileType;
    this.name = name;
    this.status = status;
    this._prID = prID;
    this.id = uid;
    this.extension = this.getExtension(this.name);
  }

  async loadFile(): Promise<void> {
    const jsonresults = await requestAPI<any>(
      `pullrequests/files/content?id=${this._prID}&filename=${this.name}`,
      'GET'
    );
    this.commitId = jsonresults['commit_id'];
    this.basecontent = jsonresults['base_content'];
    this.headcontent = jsonresults['head_content'];
  }

  async loadComments(): Promise<void> {
    const jsonresults = await requestAPI<any[]>(
      `pullrequests/files/comments?id=${this._prID}&filename=${this.name}`,
      'GET'
    );
    this.comments = jsonresults.map((rawComment: any) => {
      return new PullRequestCommentThreadModel(
        this._prID,
        this.name,
        this.commitId,
        {
          id: rawComment['id'],
          text: rawComment['text'],
          updatedAt: rawComment['updated_at'],
          lineNumber: rawComment['line_number'],
          userName: rawComment['user_name'],
          userPic: rawComment['user_pic']
        }
      );
    });
  }

  private getExtension(filename: string): string {
    return `.${filename.substring(
      filename.lastIndexOf('.') + 1,
      filename.length
    ) || filename}`;
  }

  id: string;
  fileType: DocumentRegistry.IFileType;
  name: string;
  status: string;
  commitId: string;
  extension: string;
  basecontent: string;
  headcontent: string;
  comments: PullRequestCommentThreadModel[];
  private _prID: string;
}

// -----------------------------------------------------------------------------
// Comment Model
// -----------------------------------------------------------------------------

export class PullRequestCommentThreadModel {
  // .id, this.props.data.pr.id, this.props.data.name
  constructor(
    prID: string,
    filename: string,
    commitId: string,
    given: number | IComment
  ) {
    this._filename = filename;
    this._prID = prID;
    this.replies = [];
    this._commitId = commitId;
    this.id = uniqueId();
    if (typeof given === 'number') {
      this.lineNumber = given;
      this.comment = null;
    } else {
      this.lineNumber = given.lineNumber;
      this.comment = given;
    }
  }

  getCommentReplyBody(text: string): any {
    const request = {
      text: text,
      // eslint-disable-next-line @typescript-eslint/camelcase
      in_reply_to: this.comment.id
    };
    return request;
  }

  getCommentNewBody(text: string): any {
    const request = {
      text: text,
      filename: this._filename,
      position: this.lineNumber,
      // eslint-disable-next-line @typescript-eslint/camelcase
      commit_id: this._commitId
    };
    return request;
  }

  async postComment(body: any) {
    const jsonresult = await requestAPI<any>(
      `pullrequests/files/comments?id=${this._prID}&filename=${this._filename}`,
      'POST',
      body
    );
    const comment = {
      id: jsonresult['id'],
      text: jsonresult['text'],
      updatedAt: jsonresult['updated_at'],
      lineNumber: jsonresult['line_number'],
      userName: jsonresult['user_name'],
      userPic: jsonresult['user_pic']
    };
    if (this.comment === null) {
      this.comment = comment;
    } else {
      this.replies.push(comment);
    }
  }

  id: string;
  file: PullRequestFileModel;
  protected _commitId: string;
  lineNumber: number;
  comment: IComment;
  replies: IComment[];
  private _prID: string;
  private _filename: string;
}

// A Monaco plain diff specific implementation of comments
export class PullRequestPlainDiffCommentThreadModel {
  /**
   * @remarks
   * Uses trick from https://github.com/microsoft/monaco-editor/issues/373 (used for Monaco error overlays)
   * 1) Insert a view zone to reserve a vertical gap in the text
   * 2) Inserts an overlay widget that is kept position-wise in sync with the view zone
   */

  constructor(
    thread: PullRequestCommentThreadModel,
    plainDiff: PlainDiffComponent
  ) {
    this.thread = thread;
    this.plainDiff = plainDiff;
    this.viewZoneId = null;
    this.domNode = null;
    this.initComment();
  }

  initComment() {
    const overlayDom = document.createElement('div');
    overlayDom.style.width = '100%';
    overlayDom.style.visibility = 'visible';

    const overlayWidget = {
      getId: () => 'overlay.zone.widget.' + this.thread.id,
      getDomNode: () => overlayDom,
      getPosition: (): any => null
    };
    this.plainDiff.state.diffEditor
      .getModifiedEditor()
      .addOverlayWidget(overlayWidget);

    ReactDOM.render(
      <PullRequestCommentThread
        thread={this.thread}
        handleRemove={() => this.plainDiff.removeComment(this)}
        plainDiff={this}
      />,
      overlayDom,
      () => {
        this.domNode = overlayDom;
        setTimeout(() => this.addToEditor(), 0);
      }
    );
  }

  toggleUpdate() {
    this.removeFromEditor();
    this.addToEditor();
  }

  deleteComment() {
    this.removeFromEditor();
    this.domNode.remove();
  }

  private addToEditor() {
    const zoneNode = document.createElement('div');
    zoneNode.id = this.thread.id;
    const marginZoneNode = document.createElement('div');

    this.plainDiff.state.diffEditor
      .getModifiedEditor()
      .changeViewZones(changeAccessor => {
        this.viewZoneId = changeAccessor.addZone({
          afterLineNumber: this.thread.lineNumber,
          heightInPx: this.domNode.clientHeight,
          domNode: zoneNode,
          marginDomNode: marginZoneNode,
          onDomNodeTop: top => {
            this.domNode.style.top = top + 'px';
            this.domNode.style.visibility = 'visible';
          }
        });
      });
  }

  removeFromEditor() {
    const tempViewZoneId = this.viewZoneId;
    this.plainDiff.state.diffEditor
      .getModifiedEditor()
      .changeViewZones(changeAccessor => {
        changeAccessor.removeZone(tempViewZoneId);
      });
    this.viewZoneId = null;
  }

  viewZoneId: number;
  domNode: HTMLElement;
  plainDiff: PlainDiffComponent;
  thread: PullRequestCommentThreadModel;
}
