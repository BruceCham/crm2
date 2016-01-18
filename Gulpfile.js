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
    return gulp.src(srcPath + 'modules/**/*.html')
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
    return gulp.src(distPath + '**/*.{png,jpg,gif}')
        .pipe(plugins.imagemin({
            progressive: true,
            svgoPlugins: [{
                removeViewBox: false
            }],
            use: [pngquant()]
        }))
        .pipe(gulp.dest(distPath));
});

/*
 * @desc Transport JS
 */
gulp.task("cmd", function() {
    return gulp.src([distPath + 'modules/**/*.js'])
        .pipe(plugins.plumber())
        .pipe(plugins.cmdTransit({
            dealIdCallback: function(id) {
                return 'crm-modules/' + id;
            }
        }))
        .pipe(gulp.dest(distPath + 'modules/'))
        .pipe(plugins.uglify({
            mangle: true,
            compress: {
                drop_console: true
            }
        }))
        .pipe(gulp.dest(distPath + 'modules/'))
});

/*
 * @desc 获取需要合并及md5处理的文件路径
 */
function getRevMergeFileSrc( isMd5 ) {
    var json = require('./crm2-dist/buildRoute.json');
    if (!json) return;
    var delDataArr = [];
    for (var o in json) {
        delDataArr.push(distPath + 'modules/' + o + "/*");
        if( isMd5 ){
            delDataArr.push('!' + distPath + 'modules/' + o + "/" + json[o] + "-revfile-*.js");
        }else{
            delDataArr.push('!' + distPath + 'modules/' + o + "/" + json[o] + ".js");
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
gulp.task('del-md5', function() {
    del(getRevMergeFileSrc( true ));
});

/*
 * @desc merge文件
 */
var buildFileTask = [];
gulp.task('merge', function() {
    var json = require('./crm2-dist/buildRoute.json');
    if (!json) return;
    for (var o in json) {
        buildFileTask.push(o);
    }
    buildFileTask.forEach(function(fileName) {
        gulp.task(fileName, function() {
            return gulp.src(distPath + 'modules/' + fileName + "/**/*.js")
                .pipe(plugins.order([distPath + 'modules/' + fileName + "/**/*.js"]))
                .pipe(plugins.plumber())
                .pipe(plugins.concat(json[fileName] + ".js"))
                .pipe(plugins.uglify({
                    mangle: true,
                    compress: {
                        drop_console: true
                    }
                }))
                .pipe(gulp.dest(distPath + 'modules/' + fileName + "/"))
                .pipe(plugins.rename({
                    suffix: '-revfile'
                }))
                .pipe(gulp.dest(distPath + 'modules/' + fileName + "/"))
        });
    });
});
/*
 * @desc md5文件处理
 */
gulp.task('rev', function() {
    return gulp.src(distPath + 'modules/**/*-revfile.js')
        .pipe(plugins.rev())
        .pipe(gulp.dest(distPath + 'modules/'))
        .pipe(plugins.rev.manifest())
        .pipe(gulp.dest(distPath))
});

function transportJson() {
    var json = require('./crm2-dist/rev-manifest.json');
    if (!json) return;
    var backJson = '[';
    for (var o in json) {
        backJson += '["crm2/modules/' + o.replace(/-revfile/, '') + '","crm2/modules/' + json[o] + '"],';
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
    fs.writeFile('./crm2-dist/rev-manifest.json', strs, function(err) {
        if (err) {
            return console.error(err);
        }
        return gulp.src([distPath + 'app.js', distPath + 'rev-manifest.json'])
            .pipe(plugins.plumber())
            .pipe(plugins.concat("app.js"))
            .pipe(gulp.dest(distPath))
    });
});
gulp.task('maptoapp', function() {
    return gulp.src([distPath + 'app.js', distPath + 'rev-manifest.json'])
        .pipe(plugins.plumber())
        .pipe(plugins.concat("app.js"))
        .pipe(gulp.dest(distPath))
});

/*
 * @desc 默认监听less文件和html转为jst函数
 */
gulp.task("default", ['less-min', 'jst', 'look']);

/*
 * @desc 代码构建
 */
gulp.task("build", function(cb) {
    plugins.sequence('clean', 'copy', ['min-image', 'cmd'], 'merge', buildFileTask, 'del', cb);
});

gulp.task("build-md5", function(cb) {
    plugins.sequence('clean', 'copy', ['min-image', 'cmd'], 'merge', buildFileTask, 'rev', 'jsmap', 'del-md5', cb);
});