var gulp = require('gulp'),
  watch = require('gulp-watch'),
  concat = require('gulp-concat'),
  less = require('gulp-less'),
  path = require('path');

gulp.task('scripts', function() {
  return gulp.src([
    'js/init.js',
    'js/utils/configs.js',
    'js/utils/help.js',
    'js/utils/export.js',
    'js/utils/loadframework.js',
    'js/utils/api.js',
    'js/utils/panel.js',
    'js/main.js'
    ])
    .pipe(concat('common.js'))
    .pipe(gulp.dest('../scripts/'));
});

gulp.task('less', function () {
  return gulp.src('./less/*.less')
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    .pipe(gulp.dest('../panel/assets/css/'));
});


gulp.task('watch', function () {
  gulp.watch(['**/*.js'], ['scripts']);
  gulp.watch(['**/*.less'], ['less']);
});
