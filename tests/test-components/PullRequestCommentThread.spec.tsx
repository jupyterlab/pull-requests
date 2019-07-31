import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { IPullRequestCommentThreadProps, PullRequestCommentThread } from '../../src/components/diff/PullRequestCommentThread';
import { SamplePullRequestCommentThreadItemNew, SamplePullRequestCommentThreadItemReply } from "./testutils";

// Unit tests for PullRequestBrowserItem
describe('PullRequestBrowserItem', () => {
    
    let newProps: IPullRequestCommentThreadProps = {
        thread: SamplePullRequestCommentThreadItemNew,
        handleRemove: () => {}
    };

    let replyProps: IPullRequestCommentThreadProps = {
        thread: SamplePullRequestCommentThreadItemReply,
        handleRemove: () => {}
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
        it('should init with input if new, init without input if reply', () => {
            expect(newComponent.find('.jp-PullRequestInputFormTextArea')).toHaveLength(1);
            expect(newComponent.find('.jp-PullRequestInputButtonContainer')).toHaveLength(1);
            expect(newComponent.find('.jp-PullRequestInputFormButton')).toHaveLength(0);
            expect(replyComponent.find('.jp-PullRequestInputFormTextArea')).toHaveLength(0);
            expect(replyComponent.find('.jp-PullRequestInputButtonContainer')).toHaveLength(0);
            expect(replyComponent.find('.jp-PullRequestInputFormButton')).toHaveLength(1);
        });
        it('should show input if isInput is true', () => {
            newComponent.setState({isInput: true})
            expect(newComponent.find('.jp-PullRequestInputFormTextArea')).toHaveLength(1);
            expect(newComponent.find('.jp-PullRequestInputButtonContainer')).toHaveLength(1);
            expect(newComponent.find('.jp-PullRequestInputFormButton')).toHaveLength(0);
        });
        it('should show not input if isInput is false', () => {
            newComponent.setState({isInput: false})
            expect(newComponent.find('.jp-PullRequestInputFormTextArea')).toHaveLength(0);
            expect(newComponent.find('.jp-PullRequestInputButtonContainer')).toHaveLength(0);
            expect(newComponent.find('.jp-PullRequestInputFormButton')).toHaveLength(1);
        });
    });
});