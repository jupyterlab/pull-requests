import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { IPullRequestTabProps, PullRequestTab } from '../../components/tab/PullRequestTab';
import { PullRequestItem } from '../../utils';
import { SAMPLE_PR_JSON } from '../testutils';

// Unit tests for PullRequestTab
describe('PullRequestTab', () => {
    
    let props: IPullRequestTabProps = {
        data: new PullRequestItem(SAMPLE_PR_JSON)
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
        it('should have a header', () => {
            expect(component.find('h1')).toHaveLength(1);
            expect(component.contains([<h1>{props.data.title}</h1>])).toEqual(true);
        });
        it('should have a header', () => {
            expect(component.find('p')).toHaveLength(1);
            expect(component.contains([<p>{props.data.body}</p>])).toEqual(true);
        });
    });
});