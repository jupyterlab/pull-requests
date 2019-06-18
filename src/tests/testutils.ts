import * as samplepr from './samplepr.json';
import { PullRequestCommentThreadModel, PullRequestFileModel, PullRequestCommentModel, PullRequestModel } from '../models';

export let SAMPLE_PR_JSON: string = JSON.stringify(samplepr);

export let SamplePullRequestItem = new PullRequestModel(
    "https://api.github.com/repos/timnlupo/juypterlabpr-test/pulls/1",
    "Interesting PR for feature",
    "This is a feature that tests a bunch of different types",
    "457075994"
);

export let SamplePullRequestIpynbFileItem = new PullRequestFileModel(
    "test.ipynb",
    "modified",
    SamplePullRequestItem
);

export let SamplePullRequestPlainFileItem = new PullRequestFileModel(
    "test.js",
    "modified",
    SamplePullRequestItem
);

export let SamplePullRequestCommentItem: PullRequestCommentModel = {
    id: 296364299,
    text: "too boring",
    lineNumber: 9,
    username: "timnlupo",
    userpic: "https://avatars1.githubusercontent.com/u/9003282?v=4"
}

export let SamplePullRequestCommentThreadItemNew = new PullRequestCommentThreadModel(
    SamplePullRequestIpynbFileItem,
    3
);

export let SamplePullRequestCommentThreadItemReply = new PullRequestCommentThreadModel(
    SamplePullRequestIpynbFileItem,
    SamplePullRequestCommentItem
);
