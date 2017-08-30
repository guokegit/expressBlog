var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var routes = require('./routes/index');
var settings = require('./settings');
var flash = require('connect-flash');
var multer = require('multer');

var app = express();

module.exports = app;
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(flash());
app.set('port', 3000);
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
//文件上传
var upload = multer({
    storage: multer.diskStorage({
        //设置上传后文件路径，uploads文件夹会自动创建。
        destination:  './public/uploads',
        //给上传文件重命名，获取添加后缀名
        filename   : function (req, file, cb) {
            //文件后缀
            var fileFormat = (file.originalname).split('.');
            //返回拼接新的文件名
            //file.fieldname为上传该文件的 input 的 name 值
            //cb(null, file.fieldname + '-' + Date.now() + '.' + fileFormat[fileFormat.length - 1]);
            cb(null,file.originalname)
        },
    }),
}).fields([{'name':'file',maxCount:5}])
app.use(upload)

//用户验证
app.use(session({
    secret           : settings.cookieSecret,
    key              : settings.db,
    resave           : true,
    saveUninitialized: false,
    cookie           : {maxAge: 1000 * 60 * 60 * 24 * 30},//30days
    store            : new MongoStore({
        db  : settings.db,
        host: settings.host,
        port: settings.port,
        url : 'mongodb://localhost/blog' //要加一个url,
    }),
}));

routes(app);

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});