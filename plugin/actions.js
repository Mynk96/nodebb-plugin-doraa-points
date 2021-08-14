(function (Action) {
    'use strict';

    const async = require('async');

    const settings = require('./settings'),
          database = require('./database');
    const posts = require.main.require('./src/posts');

    const debug = function (id, delta, total) {
        console.log('User %d changed amount of points on %d, total: %d', id, delta, total);
    };

    const groupChange = function (users, done) {
        async.each(users, function (user, next) {
            incrementPoints(user.uid, user.points, next);
        }, done);
    };

    const incrementPoints = function (uid, increment, done) {
        // TODO Prevent points assignment for guest users
        done = done || (() => undefined);
        database.incrementBy(uid, increment, function (error, points) {
            if (error) {
                return done(error);
            }
            //TODO Today Statistics
            //debug(uid, increment, points);
            done(null);
        });
    };

    /**
     * Adding post
     * @param postData {object} Post with signature - { pid:3, uid:1, tid:'1', content:'text', timestamp:1429974406764, reputation:0, votes: 0, edited: 0, deleted: 0, cid:2 }
     */
    Action.postSave = function (postData) {
        var value = settings.get().postWeight;
        incrementPoints(postData.post.uid, value);
    };

    /**
     * Removing of previous up-vote for the post
     * Reputation actions could be found in favourites.js, line 206
     * @param metadata {object} aggregated data -  { pid:'2', uid:1, owner:2, current:'unvote'}
     */
    Action.postUnvote = function (metadata) {
        //Handle unvotes only for upvotes
        if (metadata.current === 'upvote') {
            groupChange([
                {uid: metadata.owner, points: -settings.get().reputationWeight},
                {uid: metadata.uid, points: -settings.get().reputationActionWeight}
            ], function (error) {
                if (error) {
                    console.error(error);
                }
            })
        }
    };

    Action.postUpvote = function (metadata) {
        groupChange([
            {uid: metadata.owner, points: settings.get().reputationWeight},
            {uid: metadata.uid, points: settings.get().reputationActionWeight}
        ], function (error) {
            if (error) {
                console.error(error);
            }
        })
    };

    /**
     *
     * @param topicData {object} Signature - { tid:2, uid:1, cid:'1', mainPid:0, title: 'text', slug:'text', timestamp: 429976183015, lastposttime:0, postcount:0, viewcount:0, locked:0, deleted:0, pinned:0 }
     */
    Action.topicSave = function (topicData) {
        console.log(parseInt(topicData.topic.cid) === 3);
        let value = settings.get().topicWeight;
        if (parseInt(topicData.topic.cid) === 3) {
            incrementPoints(topicData.topic.uid, 5);
            return;
        }
        incrementPoints(topicData.topic.uid, value);
    };

    /**
     *
     * @param topicData {object} Signature - { topic: { tid:1, uid:2 }, uid:1 }
     */
    Action.topicPurge = function(topicData) {
        let value = -settings.get().topicWeight;
        if (parseInt(topicData.topic.cid) === 3) {
            incrementPoints(topicData.topic.uid, -5);
            return;
        }
        incrementPoints(topicData.topic.uid, value);
    }

    Action.toggleSolved = async function(data) {
        if (data.pid) {
            const postData = await posts.getPostData(data.pid);
            (data.isSolved) ? incrementPoints(postData.uid, 4) : incrementPoints(postData.uid, -4);
        }
    }


})(module.exports);
