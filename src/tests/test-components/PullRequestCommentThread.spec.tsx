import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { IPullRequestCommentThreadProps, PullRequestCommentThread } from '../../components/diff/PullRequestCommentThread';
import { SamplePullRequestCommentThreadItemNew, SamplePullRequestCommentThreadItemReply } from "../testutils";

// Unit tests for PullRequestBrowserItem
describe('PullRequestBrowserItem', () => {
    
    let newProps: IPullRequestCommentThreadProps = {
        thread: SamplePullRequestCommentThreadItemNew
    };

    let replyProps: IPullRequestCommentThreadProps = {
        thread: SamplePullRequestCommentThreadItemReply
    };

    // Test constructor
    describe('#constructor()', () => {
        it('should construct a new thread', () => {
            const pullRequestBrowser = new PullRequestCommentThread(newProps);
            expect(pullRequestBrowser).toBeInstanceOf(PullRequestCommentThread);
        });
        it('should construct a reply thread', () => {
            const pullRequestBrowser = new PullRequestCommentThread(replyProps);
            expect(pullRequestBrowser).toBeInstanceOf(PullRequestCommentThread);
        });
    });

    // Test render
    describe('#render()', () => {
        const newComponent = shallow(<PullRequestCommentThread {...newProps} />);
        const replyComponent = shallow(<PullRequestCommentThread {...replyProps} />)
        it('should show existing comments if there are any', () => {
            expect(newComponent.find('.jp-PullRequestCommentItem')).toHaveLength(0);
            expect(replyComponent.find('.jp-PullRequestCommentItem')).toHaveLength(1);
        });
        it('should show inputs for both components', () => {
            expect(newComponent.find('.jp-PullRequestInputContainer')).toHaveLength(1);
            expect(replyComponent.find('.jp-PullRequestInputContainer')).toHaveLength(1);
        });
        it('should show headers for both components', () => {
            expect(newComponent.find('.jp-PullRequestCommentHeader')).toHaveLength(1);
            expect(replyComponent.find('.jp-PullRequestCommentHeader')).toHaveLength(1);
        });
    });
});