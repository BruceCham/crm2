var _ = require('lodash');
var gutil = require('gulp-util');
var through = require('through2');

module.exports = function(options) {
  var options = options || null;
  var stream = through.obj(function(file, enc, cb) {
    if (file.isNull()) {
      this.push(file);
      return cb();
    }
    if (file.isBuffer()) {
      try {
        if( options ){
          var fileContent = file.contents.toString();
          options.forEach(function ( item ){
            var imgarrs = item.split('imgToMd5s');
            var palt = new RegExp(imgarrs[0].toString() , 'g');
            var replacement = imgarrs[1].toString();
            // fileContent.replace( palt, imgarrs[1].toString() )
            file.contents = new Buffer(String(file.contents).replace( palt , replacement));
          });
        }
      } catch(err) {
        this.emit('error', 'img md5 error');
      }

      this.push(file);
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', 'img md5 stream error');
      return cb();
    }
  });

  return stream;
};