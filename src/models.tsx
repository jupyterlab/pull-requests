import { uniqueId } from 'lodash';
import { requestAPI } from './utils';
import { IComment } from './tokens';

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
  protected _commitId: string;
  lineNumber: number;
  comment: IComment;
  replies: IComment[];
  private _prID: string;
  private _filename: string;
}
