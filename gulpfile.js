'use strict';

var argv       = require('yargs').argv;
var fs         = require('fs');
var gulp       = require('gulp');
var gu_concat  = require('gulp-concat');
var gu_dl      = require('gulp-download');
var gu_if      = require('gulp-if');
var gu_install = require('gulp-install');
var gu_jedit   = require("gulp-json-editor");
var gu_lr      = require('gulp-livereload');
var gu_minify  = require('gulp-minify-css');
var gu_rm      = require('gulp-rm');
var gu_sass    = require('gulp-sass');
var gu_tpls    = require('gulp-angular-templatecache');
var gu_uglify  = require('gulp-uglify');
var gu_util    = require('gulp-util');
var gu_zip     = require('gulp-zip');
var nw_builder = require('node-webkit-builder');
var unzip      = require('unzip');

var version = '0.0.5';
var nwVersion = '0.12.1';
var libFile = 'libs-'+nwVersion+'.zip';
var libUrl = 'http://zspin.vik.io/libraries/'+libFile;
var platform = null;
var task = argv._[0];
var debug = argv.d;
var watch = (task === 'watch');

/*************************** Platform detection ******************************/

// if -p parameter undefined, platform = current platform
// else platform = -p parameter value
if (argv.p === undefined) {
  if (process.platform === 'darwin') {
    platform = process.arch === 'x64' ? 'osx64' : 'osx32';
  } else if (process.platform === 'win32') {
    platform = (process.arch === 'x64' ||
      process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432')) ? 'win64' : 'win32';
  } else if (process.platform === 'linux') {
    platform = process.arch === 'x64' ? 'linux64' : 'linux32';
  } else {
    throw new gu_util.PluginError('platform_detection', 'Unknown platform, aborting.');
  }
} else {
  platform = argv.p;
}

var releaseBin = 'zspin-'+version+'-'+platform+'.zip';

/************************************ Vendors ********************************/

var vendors = {
  'scripts': [
    'bower_components/jquery/dist/jquery.js',
    'bower_components/jswheel/jswheel.js',
    'bower_components/angular/angular.js',
    'bower_components/ng-load/ng-load.js',
    'bower_components/ng-resize/ngresize.js',
    'bower_components/angular-route/angular-route.js',
    'bower_components/angular-piwik/dist/angular-piwik.js',
    'bower_components/angular-animate/angular-animate.js',
    // 'bower_components/angular-gamepad/dist/angular-gamepad.js', // Fixme
    'bower_components/angular-hotkeys/build/hotkeys.js',
    'bower_components/gsap/src/uncompressed/TweenLite.js',
    'bower_components/gsap/src/uncompressed/plugins/CSSPlugin.js',
    'bower_components/gsap/src/uncompressed/jquery.gsap.js',
    'bower_components/json-formatter/dist/json-formatter.js',
    'bower_components/angular-toastr/dist/angular-toastr.tpls.js',
    'bower_components/jplayer/dist/jplayer/jquery.jplayer.js',
  ],
  'styles': [
    'bower_components/skeleton/css/normalize.css',
    'bower_components/skeleton/css/skeleton.css',
    'bower_components/json-formatter/dist/json-formatter.css',
    'bower_components/angular-toastr/dist/angular-toastr.css',
  ],
  'fonts': [
//    'bower_components/bootstrap/dist/fonts/*', // * preserve dir structure
  ]
};

gulp.task('vendors:scripts', function() {
  return gulp.src(vendors.scripts)
    .pipe(gu_concat('vendors.js'))
    .pipe(gu_if(!debug, gu_uglify()))
    .pipe(gulp.dest('build/js'));
});

gulp.task('vendors:styles', function() {
  return gulp.src(vendors.styles)
    .pipe(gu_concat('vendors.css'))
    .pipe(gu_minify())
    .pipe(gulp.dest('build/css'));
});

gulp.task('vendors:fonts', function() {
  return gulp.src(vendors.fonts)
    .pipe(gulp.dest('build/fonts'));
});

gulp.task('vendors', ['vendors:scripts', 'vendors:styles' ,'vendors:fonts']);

/************************************ App ************************************/

var app = {
  'statics': [
    'app_statics/**/*',
    '!app_statics/package.json',
    '!app_statics/themeframe.js',
  ],
  'scripts': [
    'app_sources/**/*.js',
    'app_sources/index.js',
  ],
  'styles': [
    'app_sources/**/*.scss',
  ],
  'flash': [
    'bower_components/jplayer/dist/jplayer/jquery.jplayer.swf',
  ],
  'templates': [
    'app_sources/templates/*.html',
    'app_sources/**/*.html',
  ],
};

gulp.task('app:statics', function() {
  return gulp.src(app.statics)
    .pipe(gulp.dest('build'))
    .pipe(gu_install())
    .pipe(gu_if(watch, gu_lr()));
});

gulp.task('app:packagefile', ['app:statics'], function() {
  // if param -d (debug), show toolbar and set windowed
  return gulp.src('app_statics/package.json')
    .pipe(gu_if(debug, gu_jedit(function (json) {
      json.window.toolbar = true;
      json.window.fullscreen = false;
      return json;
    })))
    .pipe(gulp.dest('build'))
    .pipe(gu_if(watch, gu_lr()));
});

gulp.task('app:scripts', function() {
  return gulp.src(app.scripts)
    .pipe(gu_concat('app.js'))
    .pipe(gulp.dest('build/js'))
    .pipe(gu_if(watch, gu_lr()));
});

gulp.task('app:styles', function() {
  return gulp.src(app.styles)
    .pipe(gu_sass({
      errLogToConsole: true,
      sourceComments: 'map',
      sourceMap: 'sass'
    }))
    .pipe(gu_concat('app.css'))
    .pipe(gulp.dest('build/css'))
    .pipe(gu_if(watch, gu_lr()));
});

gulp.task('app:flash', function() {
  return gulp.src(app.flash)
    .pipe(gulp.dest('build/swf'))
    .pipe(gu_if(watch, gu_lr()));
});

gulp.task('app:templates', function() {
  return gulp.src(app.templates)
    .pipe(gu_tpls({standalone: true}))
    .pipe(gu_concat('app.tpls.js'))
    .pipe(gulp.dest('build/js'))
    .pipe(gu_if(watch, gu_lr()));
});

gulp.task('app', ['app:statics', 'app:scripts', 'app:styles', 'app:flash',
 'app:templates', 'app:packagefile']);

/******************************* Theme Frame *********************************/

var themeframe = {
  'scripts': [
    'bower_components/jquery/dist/jquery.min.js',
    'bower_components/jplayer/dist/jplayer/jquery.jplayer.min.js',
    'app_statics/themeframe.js',
  ],
};

gulp.task('themeframe:scripts', function() {
  return gulp.src(themeframe.scripts)
    .pipe(gulp.dest('build/js'))
    .pipe(gu_if(watch, gu_lr()));
});

gulp.task('themeframe', ['themeframe:scripts']);

/******************************** Libraries **********************************/

gulp.task('libraries:download', function() {
  if (fs.existsSync('cache/'+libFile)) {
    return;
  } else {
    return gu_dl(libUrl)
      .pipe(gulp.dest('cache'));
  }
});

gulp.task('libraries:unzip', ['libraries:download'], function() {
  if (fs.existsSync('libraries/win64')) {
    return;
  } else {
    // gulp-unzip is not ready yet; see:
    // https://github.com/suisho/gulp-unzip/issues/13
    return fs.createReadStream('cache/'+libFile)
      .pipe(unzip.Extract({path: 'libraries'}));
  }
});

// gulp.task('libraries:ffmpeg', ['libraries:unzip', 'release:check-nwjs'], function() {
//   var dest = 'node_modules/node-webkit-builder/cache/'+nwVersion+'/'+platform;
//   if (platform.indexOf('osx') === 0) {
//     dest += '/nwjs.app/Contents/Frameworks/nwjs Framework.framework/Libraries';
//   }

//   return gulp.src('libraries/'+platform+'/ffmpeg/*')
//     .pipe(gulp.dest(dest));
// });

// gulp.task('libraries:ffmpeg-release', ['libraries:unzip', 'release:check-nwjs',
//   'release:build'], function() {
//   var dest = 'releases/zspin/'+platform;
//   if (platform.indexOf('osx') === 0) {
//     dest += '/zspin.app/Contents/Frameworks/nwjs Framework.framework/Libraries';
//   }

//   return gulp.src('libraries/'+platform+'/ffmpeg/*')
//     .pipe(gulp.dest(dest));
// });

gulp.task('libraries:clean', function() {
  return gulp.src('build/plugins/**/*', {read: false})
    .pipe(gu_rm());
});

gulp.task('libraries:flashplayer', ['libraries:unzip', 'libraries:clean', 'release:check-nwjs'], function() {
  return gulp.src('libraries/'+platform+'/flashplayer/**')
    .pipe(gulp.dest('build/plugins'));
});

// gulp.task('libraries', ['libraries:ffmpeg', 'libraries:flashplayer']);
gulp.task('libraries', ['libraries:flashplayer']);

/********************************** Releases *********************************/

gulp.task('release:check-platform', function() {
  if (argv.p === undefined) {
    throw new gu_util.PluginError(
      'task release',
      'Undefined platform !\nUse -p [win32,win64,osx32,osx64,linux32,linux64]\n'
    );
  }
});

gulp.task('release:check-nwjs', ['app:statics', 'app:packagefile'], function() {
  // check and downloads nwjs if not present.
  var nwb = new nw_builder({
    files: ['build/**'],
    buildDir: 'releases/',
    version: nwVersion,
    cacheDir: 'node_modules/node-webkit-builder/cache',
    platforms: [platform],
  });

  // see https://github.com/mllrsohn/node-webkit-builder/blob/master/lib/index.js#L89
  return nwb.checkFiles().bind(nwb)
    .then(nwb.resolveLatestVersion)
    .then(nwb.checkVersion)
    .then(nwb.platformFilesForVersion)
    .then(nwb.downloadNodeWebkit);
});

gulp.task('release:build', ['release:check-platform', 'release:check-nwjs',
  'vendors', 'app', 'themeframe', 'libraries:flashplayer'], function() {

  var nwb = new nw_builder({
      files: ['build/**'],
      buildDir: 'releases/',
      version: nwVersion,
      cacheDir: 'node_modules/node-webkit-builder/cache',
      platforms: [platform],
      winIco: 'assets/256.ico',
      macIcns: 'assets/256.icns',
  });

  return nwb.build();
});

// gulp.task('release:zip', ['release:build', 'libraries:ffmpeg-release'], function() {
gulp.task('release:zip', ['release:build'], function() {
  return gulp.src('releases/zspin/'+platform+'/**/*')
    .pipe(gu_zip(releaseBin))
    .pipe(gulp.dest('releases'));
});

gulp.task('release', ['release:zip'], function() {
  gu_util.log(gu_util.colors.green("Build success ! releases/"+releaseBin));
});

/*********************************** Watch ***********************************/

gulp.task('watch', ['default'], function() {
  gulp.watch(app.statics, ['app:statics']);
  gulp.watch(app.styles, ['app:styles']);
  gulp.watch(app.scripts, ['app:scripts']);
  gulp.watch(app.templates, ['app:templates']);
  gulp.watch('app_statics/package.json', ['app:packagefile']);
  gulp.watch(themeframe.scripts, ['themeframe:scripts']);
  gu_util.log(gu_util.colors.green("Ready, execute 'make run' in another terminal"));
});

/********************************** Default **********************************/

gulp.task('default', ['vendors', 'app', 'themeframe', 'libraries']);

