var fs = require('fs'),
    gulp = require("gulp"),
    gulpLoadPlugins = require('gulp-load-plugins'),
    plugins = gulpLoadPlugins();

var srcPath = "crm2/",
    distPath = "crm2-dist/";

/*
 * @desc less文件监听、编译
*/
var lessDir = 'crm2/assets/style/';
gulp.task('less-min',function(){
  var onError = function(err) {
      plugins.notify.onError({
                  title:    "Gulp",
                  subtitle: "Failure!",
                  message:  "less error: <%= error.message %>",
                  sound:    "Beep"
              })(err);
      this.emit('end');
  };
  return gulp.src([lessDir + 'all.less'])
        .pipe(plugins.plumber({errorHandler: onError}))
        .pipe(plugins.less())
        .pipe(plugins.autoprefixer({
          browsers: ['last 20 versions'],
          cascade: true
         }))
        .pipe(plugins.minifyCss())
        .pipe(gulp.dest( lessDir ))
        .pipe(plugins.notify({
           title: 'Gulp',
           subtitle: 'success',
           message: 'less OK',
           sound: "Pop"
        }))
        .pipe(plugins.livereload());
});

/*
 * @desc Html转js文件
*/
gulp.task('jst',function(){
  var onError = function(err) {
      plugins.notify.onError({
                  title:    "Gulp",
                  subtitle: "Failure!",
                  message:  "html error: <%= error.message %>",
                  sound:    "Beep"
              })(err);
      this.emit('end');
  };
  return gulp.src( srcPath + 'modules/**/*.html')
        .pipe(plugins.plumber({errorHandler: onError}))
        .pipe(plugins.cmdJst({
                cmd : true,
                namespace : false,
                evaluate: /##([\s\S]+?)##/g,
                interpolate: /\{\{(.+?)\}\}/g,
                escape: /\{\{\{\{-([\s\S]+?)\}\}\}\}/g
            }))
        .pipe(plugins.rename({suffix: '-html'}))
        .pipe(gulp.dest( srcPath + 'modules/' ))
});

/*
* @desc less html变化 刷新浏览器 livereload
*/
gulp.task('look', function () {
    plugins.livereload.listen();
    gulp.watch([srcPath + '**/*.less'], ['less-min']);
    // gulp.watch([srcPath + '**/*.js','!'+srcPath + '**/*-html.js']).on('change',function(e){
    //   jsHintrc(e);
    // });
    gulp.watch([srcPath + '**/*.html']).on('change',function(e){
      var onError = function(err) {
          plugins.notify.onError({
                      title:    "Gulp",
                      subtitle: "Failure!",
                      message:  "html error: <%= error.message %>",
                      sound:    "Beep"
                  })(err);
          this.emit('end');
      };
      return gulp.src( e.path,{ base: srcPath + 'modules/' } )
            .pipe(plugins.plumber({errorHandler: onError}))
            .pipe(plugins.cmdJst({
                    cmd : true,
                    namespace : false,
                    evaluate: /##([\s\S]+?)##/g,
                    interpolate: /\{\{(.+?)\}\}/g,
                    escape: /\{\{\{\{-([\s\S]+?)\}\}\}\}/g
                }))
            .pipe(plugins.rename({suffix: '-html'}))
            .pipe(gulp.dest( srcPath + 'modules/' ))
            .pipe(plugins.notify({
               title: 'Gulp',
               subtitle: 'success',
               message: 'jst OK',
               sound: "Pop"
            }))
            .pipe(plugins.livereload());
    });
});

/*
* @desc js校验
*/
function jsHintrc(e){
    var onError = function(err) {
        plugins.notify.onError({
                    title:    "Gulp",
                    subtitle: "Failure!",
                    message:  "js error: <%= error.message %>",
                    sound:    "Beep"
                })(err);
        this.emit('end');
    };
    return gulp.src( e.path,{ base: srcPath + 'modules/' } )
          .pipe(plugins.plumber({errorHandler: onError}))
          .pipe(plugins.jslint({
            nomen: true,
            sloppy: true,
            plusplus: true,
            unparam: true,
            stupid: true
          }))
          .pipe(gulp.dest( srcPath + 'modules/' ));
}
/*
* @desc 清理dist目录文件
*/
gulp.task("clean",function(){
  return gulp.src( distPath , {read: false})
         .pipe(plugins.rimraf());
});

/*
* @desc 复制文件到dist目录
*/
gulp.task("copy",function(){
  return gulp.src([
            srcPath + '**/*.*',
            '!'+srcPath+"**/*.less",
            '!'+srcPath+"**/*.sass",
            '!'+srcPath+"assets/svg/**/*.*"
         ])
         .pipe( gulp.dest( distPath ) )
});

/*
* @desc 图片进行压缩
*/
var pngquant = require('imagemin-pngquant');
gulp.task('min-image', function () {
    return gulp.src(distPath + '**/*.{png,jpg,gif}')
        .pipe(plugins.imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        }))
        .pipe(gulp.dest(distPath));
});

/*
 * @desc Transport JS
*/
gulp.task("cmd",function(){
    return gulp.src([distPath + 'modules/**/*.js'])
        .pipe(plugins.plumber())
        .pipe(plugins.cmdTransit({
              dealIdCallback: function(id){
                return 'crm2-modules/' + id;
              }
            }))
        .pipe( gulp.dest( distPath + 'modules/' ) )
});

/*
* @desc 获取需要合并及md5处理的文件路径
*/
function getRevMergeFileSrc(){
  var json = require('./crm2-dist/buildRoute.json');
  if(!json) return;
  var delDataArr = [];
  for(var o in json){
    delDataArr.push(distPath + 'modules/' + o + "/" + json[o] + "-revfile*.js");
  }
  return delDataArr;
}

/*
* @desc del文件
*/
var del = require('del');
gulp.task('del',function(){
  del(getRevMergeFileSrc());
});

/*
* @desc merge文件
*/
gulp.task('merge',function(){
    var json = require('./crm2-dist/buildRoute.json');
    if(!json) return;
    for(var o in json){
        gulp.src( distPath + 'modules/' + o + "/**/*.js" ) 
            .pipe(plugins.plumber())
            .pipe(plugins.concat( json[o] + ".js"))
            .pipe(plugins.uglify())
            .pipe( gulp.dest( distPath + 'modules/' + o + "/" ) )
            .pipe(plugins.rename({suffix: '-revfile'}))
            .pipe( gulp.dest( distPath + 'modules/' + o + "/" ) )
    }
});

/*
* @desc md5文件处理
*/
gulp.task('rev',function(){
  return gulp.src( distPath + 'modules/**/*-revfile.js' )
      .pipe(plugins.rev())
      .pipe( gulp.dest( distPath + 'modules/') )
      .pipe(plugins.rev.manifest())
      .pipe( gulp.dest( distPath ) )
});

function transportJson(){
  var json = require('./crm2-dist/rev-manifest.json');
  if(!json) return;
  var backJson = '[';
  for(var o in json){
    backJson += '["crm2/modules/' + o.replace(/-revfile/,'')+'","crm2/modules/' + json[o]+'"],';
  }
  backJson = backJson.substr(0,backJson.length-1)+']';
  return 'seajs.config({map:' + backJson +'});'
}

/*
* @desc 生成seajs config map 并合到app.js文件中
*/
gulp.task('jsmap',function(){
  var strs = transportJson();
  var fs = require("fs");
  fs.writeFile('./crm2-dist/rev-manifest.json', strs,  function(err) {
     if (err) {
         return console.error(err);
     }
    return gulp.src([distPath+'app.js',distPath+'rev-manifest.json'])
    .pipe(plugins.plumber())
    .pipe(plugins.concat( "app.js"))
    .pipe(gulp.dest(distPath))
  });
});
gulp.task('maptoapp',function(){
  return gulp.src([distPath+'app.js',distPath+'rev-manifest.json'])
    .pipe(plugins.plumber())
    .pipe(plugins.concat( "app.js"))
    .pipe(gulp.dest(distPath))
});
/*
* @desc iconfont svg生成字体库
*/
var iconSrc = 'crm2/assets/svg/',
    iconDir = 'crm2/assets/style/';
    // runTimestamp = Math.round(Date.now()/1000);
gulp.task('iconfont', function(){
  return gulp.src([iconSrc + '**/*.svg'])
    .pipe(plugins.iconfont({
      fontName: 'fxiaokefont' // required 
      //appendUnicode: true, // recommended option 
      //formats: ['ttf', 'eot', 'woff'], // default, 'woff2' and 'svg' are available 
      //timestamp: runTimestamp // recommended to get consistent builds when watching files 
    }))
      .on('glyphs', function(glyphs, options) {
            gulp.src([iconSrc + "fxiaokefont.css"])
            .pipe(plugins.consolidate('lodash', {
              glyphs: glyphs,
              fontName: 'fxiaokefont',
              fontPath: './',
              className: 'fxiaoke'
            }))
            .pipe(gulp.dest( iconDir ));

            gulp.src([iconSrc + "fxiaokefonthtml.css"])
            .pipe(plugins.consolidate('lodash', {
              glyphs: glyphs,
              fontName: 'fxiaokefont',
              fontPath: './',
              className: 'fxiaoke'
            }))
            .pipe(plugins.rename('fxiaokefonthtml.html'))
            .pipe(gulp.dest( iconDir ))
      })
    .pipe(gulp.dest( iconDir ));
});

/*
* @desc 默认监听less文件和html转为jst函数
*/
gulp.task("default",['less-min','jst','look']);

/*
* @desc 代码构建
*/
gulp.task("build",function(cb){
  plugins.sequence(['less-min','jst','clean'],'copy',['min-image','cmd'],'merge', cb);
});
gulp.task("md5",function(cb){
  plugins.sequence( 'rev','jsmap', cb);
});

gulp.task('connect-develop', function() {
    plugins.connect.server({
        root: './crm2/',
        port: 2222
    });
});