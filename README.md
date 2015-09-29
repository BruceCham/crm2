crm2
========
构建清单

Install
-------

安装依赖的模块包
建议设置淘宝镜像，速度快

```
cnpm install
```

生成字体库
-----
svg图转为字体库
```
gulp iconfont
```

开发环境
-----
执行less和html转译，页面livereload
```
gulp
```

生产构建
-----
打包合并，加入md5，文件map config
```
gulp build
gulp md5
```

Note: 
	构建时针对单个模块打包，需要在/crm2/buildRoute.json中加入映射
	For: "page/clue":"clue"  
	把page/clue目录下的所有js文件合并到page/clue/clue.js
-------