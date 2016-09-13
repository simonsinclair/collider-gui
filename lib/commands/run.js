// run.js
//

'use strict';

var collider = require('../collider');
var matter   = require('../matter');
var utils    = require('../utils');

var EventEmitter = require('events');
var spawn = require('child_process').spawn;

var Queue = require('queue');

module.exports = function (dir, done) {

  var projectDir = dir;
  var project = {};

  var matterLibIndex = [];

  var missingMatterLibIds = [];

  var gulp = null;

  var emitter = new EventEmitter();

  var q = new Queue({ concurrency: 1 });

  // 1. Load 'collider.json'.
  q.push(function (cb) {
    collider.load(projectDir, function (err, data) {
      if (err) return cb(err);
      project = data;
      cb(null);
    });
  });

  // 2. Fetch Matter lib. index.
  q.push(function (cb) {
    matter.getLibIndex(function (err, data) {
      if (err) return cb(err);
      matterLibIndex = data;
      cb(null);
    });
  });

  // 3. Check actual Collider deps. are met.
  q.push(function (cb) {
    var numMissingDeps = 0;

    var numJobs = collider.deps.length;
    var numJobsCompleted = 0;

    collider.deps.forEach(function (dep) {
      utils.exists(`${projectDir}/${dep}`, function (err) {
        if (err) {
          numMissingDeps++;
        }

        numJobsCompleted++;
        if (numJobsCompleted === numJobs) {
          finish();
        }
      });
    });

    function finish() {
      if (numMissingDeps > 0) {
        collider.update(`${projectDir}`, cb);
      } else {
        cb();
      }
    }
  });

  // 4. Check missing Matter lib. deps.
  q.push(function (cb) {
    var libIds = project.matterLibs;

    var numJobs = libIds.length;
    var numJobsCompleted = 0;

    if (numJobs > 0) {
      libIds.forEach(function (libId) {

        var locale = matter.getLibInfo(matterLibIndex, libId).locale;
        utils.exists(`${projectDir}/${locale}`, function (err) {
          if (err) {
            missingMatterLibIds.push(libId);
          };

          numJobsCompleted++;
          if (numJobsCompleted === numJobs) {
            cb();
          }
        });

      });

    } else {
      cb();
    }
  });

  // 5. Clone any missing Matter lib deps.
  q.push(function (cb) {
    var numJobs = missingMatterLibIds.length;
    var numJobsCompleted = 0;

    if (numJobs > 0) {

      missingMatterLibIds.forEach(function (libId) {
        var libInfo = matter.getLibInfo(matterLibIndex, libId);

        matter.clone(projectDir, libInfo, function (err) {
          if (err) return cb(err);

          numJobsCompleted++;
          if (numJobsCompleted === numJobs) {
            cb();
          }
        });
      });

    } else {
      cb();
    }
  });

  // 6. Ensure 'collider/_matter.scss' is built.
  q.push(function (cb) {
    var locales = [];
    project.matterLibs.forEach(function (libId) {
      locales.push(matter.getLibInfo(matterLibIndex, libId).locale);
    });

    matter.updateImports(projectDir, locales, cb);
  });

  // 7. Spawn Gulp process.
  q.push(function (cb) {
    gulp = spawn(
      `${projectDir}/node_modules/.bin/gulp`,
      ['--cwd', projectDir, '--no-color', 'default']
    );

    gulp.stdout.on('data', function (data) {
      emitter.emit('run:gulp-stdout', data.toString());
    });

    gulp.stderr.on('data', function (data) {
      emitter.emit('run:gulp-stderr', data.toString());
    });

    gulp.on('error', function (err) {
      emitter.emit('run:gulp-error', err);
    });

    gulp.on('close', function (code, signal) {
      emitter.emit('run:gulp-close', code, signal);
    });

    cb(null);
  });

  q.start(function (err) {
    if (err) return done(err, gulp);
    done(null, gulp);
  });

  return emitter;
};
