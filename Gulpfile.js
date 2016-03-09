var fs = require('fs'),
    gulp = require("gulp"),
    gulpLoadPlugins = require('gulp-load-plugins'),
    plugins = gulpLoadPlugins();

var srcPath = "crm2/",
    distPath = "crm-dist/";

/*
 * @desc less文件监听、编译
 */
var lessDir = 'crm2/assets/style/';
gulp.task('less-min', function() {
    var onError = function(err) {
        plugins.notify.onError({
            title: "Gulp",
            subtitle: "Failure!",
            message: "less error: <%= error.message %>",
            sound: "Beep"
        })(err);
        this.emit('end');
    };
    return gulp.src([lessDir + 'all.less'])
        .pipe(plugins.plumber({
            errorHandler: onError
        }))
        .pipe(plugins.less())
        .pipe(plugins.autoprefixer({
            browsers: ['last 20 versions'],
            cascade: true
        }))
        .pipe(plugins.minifyCss())
        .pipe(gulp.dest(lessDir))
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
gulp.task('jst', function() {
    var onError = function(err) {
        plugins.notify.onError({
            title: "Gulp",
            subtitle: "Failure!",
            message: "html error: <%= error.message %>",
            sound: "Beep"
        })(err);
        this.emit('end');
    };
    return gulp.src( 'crm2/**/*.html' )
        .pipe(plugins.plumber({
            errorHandler: onError
        }))
        .pipe(plugins.cmdJst({
            templateSettings: {
                evaluate: /##([\s\S]+?)##/g,
                interpolate: /\{\{(.+?)\}\}/g,
                escape: /\{\{\{\{-([\s\S]+?)\}\}\}\}/g
            },
            processName: function(filename) {
                var moudle = filename.slice(0, filename.indexOf('/'))
                return moudle + '-' + filename.slice(filename.lastIndexOf('/') + 1, filename.lastIndexOf('.'));
            },
            processContent: function(src) {
                return src.replace(/(^\s+|\s+$)/gm, '');
            },
            prettify: true,
            cmd: true
        }))
        .pipe(plugins.rename({
            suffix: '-html'
        }))
        .pipe(gulp.dest( 'crm2/' ))
});

/*
 * @desc less html变化 刷新浏览器 livereload
 */
gulp.task('look', function() {
    plugins.livereload.listen();
    gulp.watch([srcPath + '**/*.less'], ['less-min']);
    gulp.watch([srcPath + '**/*.html']).on('change', function(e) {
        var onError = function(err) {
            plugins.notify.onError({
                title: "Gulp",
                subtitle: "Failure!",
                message: "html error: <%= error.message %>",
                sound: "Beep"
            })(err);
            this.emit('end');
        };
        return gulp.src(e.path, {
                base: srcPath + 'modules/'
            })
            .pipe(plugins.plumber({
                errorHandler: onError
            }))
            .pipe(plugins.cmdJst({
                templateSettings: {
                    evaluate: /##([\s\S]+?)##/g,
                    interpolate: /\{\{(.+?)\}\}/g,
                    escape: /\{\{\{\{-([\s\S]+?)\}\}\}\}/g
                },
                processName: function(filename) {
                    var moudle = filename.slice(0, filename.indexOf('/'))
                    return moudle + '-' + filename.slice(filename.lastIndexOf('/') + 1, filename.lastIndexOf('.'));
                },
                processContent: function(src) {
                    return src.replace(/(^\s+|\s+$)/gm, '');
                },
                prettify: true,
                cmd: true
            }))
            .pipe(plugins.rename({
                suffix: '-html'
            }))
            .pipe(gulp.dest(srcPath + 'modules/'))
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
 * @desc 清理dist目录文件
 */
gulp.task("clean", function() {
    return gulp.src(distPath, {
            read: false
        })
        .pipe(plugins.rimraf());
});

/*
 * @desc 复制文件到dist目录
 */
gulp.task("copy", function() {
    return gulp.src([
            srcPath + '**/*.*',
            '!' + srcPath + "**/*.less",
            '!' + srcPath + "**/*.sass",
            '!' + srcPath + "assets/svg/**/*.*"
        ])
        .pipe(gulp.dest(distPath))
});

/*
 * @desc 图片进行压缩
 */
var pngquant = require('imagemin-pngquant');
gulp.task('min-image', function() {
    return gulp.src(srcPath + '**/*.{png,jpg,gif}')
        .pipe(plugins.imagemin({
            progressive: true,
            svgoPlugins: [{
                removeViewBox: false
            }],
            use: [pngquant()]
        }))
        .pipe(gulp.dest(srcPath));
});

/*
 * @desc Transport JS
 */
gulp.task("cmd", function() {
    return gulp.src([ 'crm-dist/**/*.js','!'+distPath + 'modules/common/echarts/echarts.js'])
        .pipe(plugins.plumber())
        .pipe(plugins.cmdTransit({
            dealIdCallback: function(id) {
                if( /\//.test( id ) ){
                    return 'crm-' + id;
                }else{
                    return 'crm/' + id;
                }
                
            }
        }))
        .pipe(gulp.dest('crm-dist/'))
        .pipe(plugins.uglify({
            mangle: true,
            compress: {
                drop_console: true
            }
        }))
        .pipe(gulp.dest( 'crm-dist/' ))
});

/*
 * @desc 业务级modules文件夹指定路径合并 merge
 */
var buildFileTask = [];
gulp.task('merge', function() {
    var json = require('./crm-dist/buildRoute.json');
    if (!json) return;
    for (var o in json) {
        buildFileTask.push(o);
    }
    buildFileTask.forEach(function(fileName) {
        gulp.task(fileName, function() {
            if( fs.lstatSync( 'crm-dist/'+fileName ).isDirectory() ){
                return gulp.src( 'crm-dist/'+fileName + "/**/*.js")
                .pipe(plugins.order(['crm-dist/' + fileName + "/**/*.js"]))
                .pipe(plugins.plumber())
                .pipe(plugins.concat(json[fileName] + ".js"))
                .pipe(plugins.uglify({
                    mangle: true,
                    compress: {
                        drop_console: true
                    }
                }))
                .pipe(gulp.dest('crm-dist/' + fileName + "/"))
                .pipe(plugins.rename({
                    suffix: '-revfile'
                }))
                .pipe(gulp.dest('crm-dist/' + fileName + "/"))
            }else{
                return gulp.src( 'crm-dist/'+fileName )
                .pipe(plugins.plumber())
                .pipe(plugins.uglify({
                    mangle: true,
                    compress: {
                        drop_console: true
                    }
                }))
                .pipe(gulp.dest('crm-dist/' + json[fileName]))
                .pipe(plugins.rename({
                    suffix: '-revfile'
                }))
                .pipe(gulp.dest('crm-dist/' + json[fileName]))
            }
            
        });
    });
});
/*
 * @desc 文件进行md5加密处理
 */
gulp.task('md5-img', function() {
    return gulp.src( ['crm-dist/**/*.{png,jpg,gif}'])
        .pipe(plugins.rev())
        .pipe(gulp.dest('crm-dist/'))
        .pipe(plugins.rev.manifest('rev-imgmanifest.json'))
        .pipe(gulp.dest(distPath))
});

gulp.task("dealImgCss",function (){
    var dealCss = require('./dealCssImg');
    var json = require('./crm-dist/rev-imgmanifest.json');
    if (!json) return;
    var imgArr = [];
    for (var o in json) {
        if( /assets\/images/.test( o ) ){
            imgArr.push(
               o.match(/images\/.*/).toString()+ "imgToMd5s" +json[o].match(/images\/.*/).toString()
            );
        }
    }
    return gulp.src('./crm-dist/assets/style/all.css')
    .pipe( plugins.minifyCss() )
    .pipe( dealCss( imgArr ) )
    .pipe( gulp.dest('./crm-dist/assets/style/') )
});

gulp.task('md5-css-js', function() {
    return gulp.src( ['crm-dist/**/*-revfile.js','crm-dist/**/*.css'])
        .pipe(plugins.rev())
        .pipe(gulp.dest('crm-dist/'))
        .pipe(plugins.rev.manifest())
        .pipe(gulp.dest(distPath))
});

function transportJson() {
    var json = require('./crm-dist/rev-manifest.json');
    if (!json) return;
    var backJson = '[';
    for (var o in json) {
        if( o == 'tpls/main/main-html-revfile.js' ){
            backJson += '["crm2/tpls/main/main.html.js' + '","crm2/' + json[o] + '"],';
        }else{
            backJson += '["crm2/' + o.replace(/-revfile/, '') + '","crm2/' + json[o] + '"],';
        }
    }
    backJson = backJson.substr(0, backJson.length - 1) + ']';
    return 'seajs.config({map:' + backJson + '});'
}

/*
 * @desc 生成seajs config map 并合到app.js文件中
 */
gulp.task('jsmap', function() {
    var strs = transportJson();
    var fs = require("fs");
    fs.writeFile('./crm-dist/map.js', strs, function(err) {
        if (err) {
            return console.error(err);
        }
    });
});

/*
 * @desc 获取需要合并及md5处理的文件路径
 */
function getRevMergeFileSrc( isMd5 ) {
    var json = require('./crm-dist/buildRoute.json');
    if (!json) return;
    var delDataArr = [];
    for (var o in json) {
        if( fs.lstatSync( 'crm-dist/'+ o ).isDirectory() ){
            delDataArr.push( 'crm-dist/' + o + "/*");
            if( isMd5 ){
                delDataArr.push('!crm-dist/' + o + "/" + json[o] + "-revfile-*.js");
            }else{
                delDataArr.push('!crm-dist/' + o + "/" + json[o] + ".js");
            }
        }
    }
    return delDataArr;
}

/*
 * @desc del文件
 */
var del = require('del');
gulp.task('del', function() {
    del(getRevMergeFileSrc());
});
gulp.task('del-tpls', function() {
    del([ 'crm-dist/app-revfile.js','crm-dist/tpls/main/*.*','!crm-dist/tpls/main/main.*js' ]);
});
gulp.task('del-modules', function() {
    del(getRevMergeFileSrc( true ));
});
function delAssetsFiles() {
    var json = require('./crm-dist/rev-manifest.json');
    if (!json) return;
    var delDataArr = ['crm-dist/app*.js','!crm-dist/*revfile-*.js','crm-dist/tpls/main/*.*','!crm-dist/tpls/main/*revfile-*.*'];
    // 暂时不删除原图片
    // for (var o in json) {
    //     if( /assets/.test( o ) ){
    //         delDataArr.push( 'crm-dist/' + o );
    //     }
    // }
    return delDataArr;
}
gulp.task('del-other', function() {
    del(delAssetsFiles());
});

/*
 * @desc 默认监听less文件和html转为jst函数
 */
gulp.task("default", ['less-min', 'jst', 'look']);

/*
 * @desc 代码构建
 */
gulp.task("build", function(cb) {
    plugins.sequence('clean', 'copy', ['cmd'], 'merge', buildFileTask ,'del','del-tpls',cb);
});

gulp.task("build-md5", function(cb) {
    plugins.sequence('clean', 'copy', ['cmd'], 'merge', buildFileTask, 'md5-img', 'dealImgCss','md5-css-js','del-modules','del-other','jsmap',cb);
});