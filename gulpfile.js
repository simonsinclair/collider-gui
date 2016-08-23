// gulpfile.js
//

'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');

gulp.task('sass', function () {
  return gulp.src('./sass/main.scss')
    .pipe(sass({ outputStyle: 'compact' }))
      .on('error', sass.logError)
    .pipe(autoprefixer({ browsers: ['last 2 Chrome versions'] }))
    .pipe(gulp.dest('./css'));
});

gulp.task('watch', function (done) {
  gulp.watch('./sass/*.scss', gulp.parallel('sass'));
  done();
});

gulp.task('default', gulp.series('sass', 'watch'));
