import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { IPullRequestTabProps, PullRequestTab } from '../../components/tab/PullRequestTab';
import { SamplePullRequestIpynbFileItem, SamplePullRequestPlainFileItem } from '../testutils';

// Unit tests for PullRequestTab
describe('PullRequestTab', () => {
    
    let props: IPullRequestTabProps = {
        file: SamplePullRequestIpynbFileItem,
        themeManager: null,
        renderMime: null
    };

    // Test constructor
    describe('#constructor()', () => {
        const pullRequestBrowser = new PullRequestTab(props);
        it('should construct a new branch header', () => {
            expect(pullRequestBrowser).toBeInstanceOf(PullRequestTab);
        });
    });

    // Test render
    describe('#render()', () => {
        const component = shallow(<PullRequestTab {...props} />);
        it('should be a div', () => {
            expect(component.find('div')).toHaveLength(1);
            expect(component.find('.jp-PullRequestTab')).toHaveLength(1);
        });
        it('should show NBDiff if loaded', () => {
            component.setState({file: SamplePullRequestIpynbFileItem, isLoading: false, error: null});
            expect(component.find('NBDiff')).toHaveLength(1);
            expect(component.find('PlainDiffComponent')).toHaveLength(0);
        });
        it('should not show NBDiff if not loaded', () => {
            component.setState({file: SamplePullRequestIpynbFileItem, isLoading: true, error: null});
            expect(component.find('NBDiff')).toHaveLength(0);
            expect(component.find('PlainDiffComponent')).toHaveLength(0);
        });
        it('should not show NBDiff if error', () => {
            component.setState({file: SamplePullRequestIpynbFileItem, isLoading: false, error: "error"});
            expect(component.find('NBDiff')).toHaveLength(0);
            expect(component.find('PlainDiffComponent')).toHaveLength(0);
        });
        it('should show PlainDiffComponent if loaded', () => {
            component.setState({file: SamplePullRequestPlainFileItem, isLoading: false, error: null});
            expect(component.find('PlainDiffComponent')).toHaveLength(1);
            expect(component.find('NBDiff')).toHaveLength(0);
        });
        it('should not show PlainDiffComponent if not loaded', () => {
            component.setState({file: SamplePullRequestPlainFileItem, isLoading: true, error: null});
            expect(component.find('PlainDiffComponent')).toHaveLength(0);
            expect(component.find('NBDiff')).toHaveLength(0);
        });
        it('should not show PlainDiffComponent if error', () => {
            component.setState({file: SamplePullRequestPlainFileItem, isLoading: false, error: "error"});
            expect(component.find('PlainDiffComponent')).toHaveLength(0);
            expect(component.find('NBDiff')).toHaveLength(0);
        });
    });
});