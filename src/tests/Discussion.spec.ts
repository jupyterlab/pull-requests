import { CommentWidget } from '../components/discussion/Comment';
import { InputComment } from '../components/discussion/InputComment';
import {
  Discussion,
  IDiscussionProps
} from '../components/discussion/Discussion';
import { IComment, IThread } from '../tokens';
import * as sampleComment from './sample-responses/samplecomment.json';
import { Widget } from '@lumino/widgets';

jest.mock('../components/discussion/Comment');
jest.mock('../components/discussion/InputComment');

// Unit tests for Discussion
describe('Discussion', () => {
  const DEFAULT_THREAD: IThread = {
    comments: [(sampleComment as any).default],
    filename: 'file.txt',
    id: 22,
    line: 4,
    originalLine: 2,
    pullRequestId: 'pullrequest-id'
  };

  const DEFAULT_PROPS: IDiscussionProps = {
    renderMime: {} as any,
    thread: DEFAULT_THREAD,
    handleRemove: () => void 0
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock complex children widget instantiation
    const mockComment = CommentWidget as jest.MockedClass<typeof CommentWidget>;
    mockComment.mockImplementation(() => new Widget() as any);

    const mockInputComment = InputComment as jest.MockedClass<
      typeof InputComment
    >;
    mockInputComment.mockImplementation(() => new Widget() as any);
  });

  // Test constructor
  describe('#constructor()', () => {
    it('should construct a discussion', () => {
      const discussion = new Discussion(DEFAULT_PROPS);
      expect(discussion).toBeInstanceOf(Discussion);

      expect(discussion.isExpanded).toEqual(true);
      expect(discussion.inputShown).toEqual(false);

      expect(
        CommentWidget as jest.MockedClass<typeof CommentWidget>
      ).toHaveBeenCalledTimes(DEFAULT_THREAD.comments.length);
      expect(
        InputComment as jest.MockedClass<typeof InputComment>
      ).not.toHaveBeenCalled();

      expect(
        discussion.node.querySelectorAll('.jp-PullRequestReplyButton')
      ).toHaveLength(1);
    });

    it('should construct a new discussion', () => {
      const discussion = new Discussion({
        ...DEFAULT_PROPS,
        thread: { ...DEFAULT_THREAD, comments: [] }
      });
      expect(discussion).toBeInstanceOf(Discussion);

      expect(discussion.isExpanded).toEqual(true);
      expect(discussion.inputShown).toEqual(true);

      expect(
        CommentWidget as jest.MockedClass<typeof CommentWidget>
      ).not.toHaveBeenCalled();
      expect(
        InputComment as jest.MockedClass<typeof InputComment>
      ).toHaveBeenCalledTimes(1);

      expect(
        discussion.node.querySelectorAll('.jp-PullRequestReplyButton')
      ).toHaveLength(0);
    });

    it('should construct a single comment', () => {
      const discussion = new Discussion({
        ...DEFAULT_PROPS,
        thread: { ...DEFAULT_THREAD, singleton: true }
      });
      expect(discussion).toBeInstanceOf(Discussion);

      expect(discussion.isExpanded).toEqual(true);
      expect(discussion.inputShown).toEqual(false);

      expect(
        CommentWidget as jest.MockedClass<typeof CommentWidget>
      ).toHaveBeenCalledTimes(DEFAULT_THREAD.comments.length);
      expect(
        InputComment as jest.MockedClass<typeof InputComment>
      ).not.toHaveBeenCalled();

      expect(
        discussion.node.querySelectorAll('.jp-PullRequestReplyButton')
      ).toHaveLength(0);
    });

    it('should construct a new single comment', () => {
      const discussion = new Discussion({
        ...DEFAULT_PROPS,
        thread: { ...DEFAULT_THREAD, comments: [], singleton: true }
      });
      expect(discussion).toBeInstanceOf(Discussion);

      expect(discussion.isExpanded).toEqual(true);
      expect(discussion.inputShown).toEqual(true);

      expect(
        CommentWidget as jest.MockedClass<typeof CommentWidget>
      ).not.toHaveBeenCalled();
      expect(
        InputComment as jest.MockedClass<typeof InputComment>
      ).toHaveBeenCalledTimes(1);

      expect(
        discussion.node.querySelectorAll('.jp-PullRequestReplyButton')
      ).toHaveLength(0);
    });
  });

  describe('#isExpanded', () => {
    (
      [
        [[(sampleComment as any).default], false],
        [[], false],
        [[(sampleComment as any).default], true],
        [[], true]
      ] as Array<[Array<IComment>, boolean]>
    ).forEach(([comments, singleton]) => {
      it(`should hide comments widget if not expanded with ${
        comments.length
      } comments and ${singleton ? '' : 'not '}singleton`, () => {
        const discussion = new Discussion({
          ...DEFAULT_PROPS,
          thread: { ...DEFAULT_THREAD, comments, singleton }
        });
        jest.clearAllMocks();
        discussion.isExpanded = false;

        expect(
          CommentWidget as jest.MockedClass<typeof CommentWidget>
        ).not.toHaveBeenCalled();
        expect(
          InputComment as jest.MockedClass<typeof InputComment>
        ).not.toHaveBeenCalled();

        expect(
          discussion.node.querySelectorAll(
            '.jp-PullRequestCommentItemContentTitle'
          )
        ).toHaveLength(1);
      });
    });
  });

  describe('#inputShown', () => {
    ([false, true] as Array<boolean>).forEach(singleton => {
      it(`should show input comment widget with ${
        singleton ? '' : 'not '
      }singleton`, () => {
        const discussion = new Discussion({
          ...DEFAULT_PROPS,
          thread: { ...DEFAULT_THREAD, singleton }
        });
        jest.clearAllMocks();
        discussion.inputShown = true;

        expect(
          CommentWidget as jest.MockedClass<typeof CommentWidget>
        ).not.toHaveBeenCalled();
        expect(
          InputComment as jest.MockedClass<typeof InputComment>
        ).toHaveBeenCalledTimes(1);

        discussion.inputShown = false;

        expect(
          CommentWidget as jest.MockedClass<typeof CommentWidget>
        ).not.toHaveBeenCalled();
        expect(
          InputComment as jest.MockedClass<typeof InputComment>
        ).toHaveBeenCalledTimes(1);

        expect(
          discussion.node.querySelectorAll('.jp-PullRequestReplyButton')
        ).toHaveLength(singleton ? 0 : 1);
      });
    });
  });
});
