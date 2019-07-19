import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { IPullRequestBrowserProps, PullRequestBrowser } from '../../components/browser/PullRequestBrowser';
import { PullRequestBrowserItem } from '../../components/browser/PullRequestBrowserItem';
import { PullRequestFileModel, PullRequestModel } from '../../models';

// Unit tests for PullRequestTab
describe('PullRequestBrowser', () => {
    
    let props: IPullRequestBrowserProps = {
        showTab: async (data: PullRequestFileModel | PullRequestModel) => {
            console.log('Show tab test.')
        }
    };

    // Test constructor
    describe('#constructor()', () => {
        const pullRequestBrowser = new PullRequestBrowser(props);
        it('should construct a new branch header', () => {
            expect(pullRequestBrowser).toBeInstanceOf(PullRequestBrowser);
        });
    });

    // Test render
    describe('#render()', () => {
        const component = shallow(<PullRequestBrowser {...props} />);
        it('should be a div', () => {
            expect(component.find('div')).toHaveLength(1);
            expect(component.find('.jp-PullRequestBrowser')).toHaveLength(1);
        });
        it('should have a list', () => {
            expect(component.find('ul')).toHaveLength(1);
        });
        it('should have two PullRequestBrowserItems', () => {
            expect(component.find('PullRequestBrowserItem')).toHaveLength(2);
            expect(component.contains([<PullRequestBrowserItem showTab={props.showTab} header={'Created by Me'} filter={'created'} ></PullRequestBrowserItem>])).toEqual(true);
            expect(component.contains([<PullRequestBrowserItem showTab={props.showTab} header={'Assigned to Me'} filter={'assigned'} ></PullRequestBrowserItem>])).toEqual(true);
        });
    });
});