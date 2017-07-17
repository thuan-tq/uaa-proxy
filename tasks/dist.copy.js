'use strict';
const merge = require('merge-stream');

// ------------------------------------------------
//   Task: Copy all deployment files to Dist folder
// ------------------------------------------------

module.exports = function(gulp) {
  return function() {

    // These directories contain files that are not included in the vulcanize process for various reasons.
    // (Whenever possible files should be imported using HTML imports, so they're included in the polymer build.)
    //  see tasks/compile.polymer.js
    var extraDirectories = [
      'public/resources/'
      
    ];

    var extraStreams = [];

    extraDirectories.forEach(function(bc) {
      extraStreams.push(gulp.src([bc + '/**/*.*']).pipe(gulp.dest('dist/' + bc)));
    });

    var publicFiles = gulp.src(['public/*.*']).pipe(gulp.dest('./dist/public'));
    var server = gulp.src(['server/**/*.*']).pipe(gulp.dest('./dist/server'))
    var packageFile = gulp.src(['package.json']).pipe(gulp.dest('dist'));

    return merge(server, packageFile, extraStreams, publicFiles);
  };
};
