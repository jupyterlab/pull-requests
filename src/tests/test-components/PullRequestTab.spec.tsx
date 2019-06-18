import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { IPullRequestTabProps, PullRequestTab } from '../../components/tab/PullRequestTab';
import { PullRequestItemFile, PullRequestItem } from '../../utils';
import { SAMPLE_FILE_JSON, SAMPLE_PR_JSON } from '../testutils';

// Unit tests for PullRequestTab
describe('PullRequestTab', () => {
    
    let props: IPullRequestTabProps = {
        data: new PullRequestItemFile(JSON.stringify(JSON.parse(SAMPLE_FILE_JSON)[0]), new PullRequestItem(JSON.stringify(JSON.parse(SAMPLE_PR_JSON)[0]))),
        themeManager: null
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
        it('should show PlainDiffComponent if loaded', () => {
            let _data = props.data;
            _data.isLoaded = true;
            component.setState({data: _data});
            expect(component.find('PlainDiffComponent')).toHaveLength(1);
        });
        it('should not show PlainDiffComponent if not loaded', () => {
            let _data = props.data;
            _data.isLoaded = false;
            component.setState({data: _data});
            expect(component.find('PlainDiffComponent')).toHaveLength(0);
        });
    });
});