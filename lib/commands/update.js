// update.js
//

'use strict';

var collider = require('../collider');

var os   = require('os');
var path = require('path');

var Queue  = require('queue');
var rimraf = require('rimraf');

module.exports = function (user) {

  if (!user.update) {
    console.log();
    console.log('Update cancelled. Please make a backup of your project before continuing.');
    console.log();
    return;
  }

  var project    = {};
  var tmpArchive = path.join(os.tmpdir(), 'latest.tar.gz');

  var globs = {
    clean: [
      'collider/',
      'distribute/',
      'node_modules/',
      'gulpfile.js',
      'package.json',
      '.editorconfig',
    ],
    ignore: ['project/'],
  };

  var q = new Queue({ concurrency: 1 });

  // 1. Ensure this is a Collider project by populating 'project'.
  q.push(function (cb) {
    collider.load('.', function (err, _project) {
      if (err) cb(err);
      project = _project;
      cb(null);
    });
  });

  // 2. Clean current Collider install.
  q.push(function (cb) {
    var patterns = globs.clean;
    var numJobs  = patterns.length;
    var numJobsCompleted = 0;

    if (numJobs === 0) {
      return cb(null);
    }

    patterns.forEach(function (pattern) {
      rimraf(pattern, {}, function (err) {
        if (err) cb(err);

        numJobsCompleted++;
        if (numJobsCompleted === numJobs) {
          cb(null);
        }
      });
    });
  });

  // 3. Update Collider dependencies.
  q.push(function (cb) {
    collider.update('.', cb);
  });

  q.start(function (err) {
    if (err) throw err;
    console.log();
    console.log('Update successful. Your project is now using the latest version of Collider.');
    console.log();
  });

};
