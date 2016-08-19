// edit.js
//

'use strict';

var matter   = require('../matter');
var collider = require('../collider');

var _ = require('lodash');
var Queue  = require('queue');
var rimraf = require('rimraf');

module.exports = function (settings) {

  var project = {};
  var updatedProject = {};

  var q = new Queue({ concurrency: 1 });

  // 1. Read current project.
  q.push(function (cb) {
    collider.load('.', function (err, _project) {
      if (err) cb(err);
      project = _project;
      cb(null);
    });
  });

  // 2. Populate 'updatedProject' with old and merge changed settings.
  q.push(function (cb) {
    _.assign(updatedProject, project, settings);
    cb(null);
  });

  // 3. Clean removed Matter libs.
  q.push(function (cb) {
    var removedMatterLibs = _.difference(project.matterLibs, updatedProject.matterLibs);
    var numJobs = removedMatterLibs.length;

    if (numJobs === 0) {
      return cb(null);
    }

    var numCompleteJobs = 0;

    removedMatterLibs.forEach(function (lib) {
      matter.clean(lib, function (err) {
        if (err) cb(err);

        numCompleteJobs++;
        if (numCompleteJobs === numJobs) cb(null);
      });
    });

  });

  // 4. Write updated collider.json.
  q.push(function (cb) {
    collider.save('.', updatedProject, cb);
  });

  // Go.
  q.start(function (err) {
    if (err) throw err;
  });

};
