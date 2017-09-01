//引入 node 模块,用来生成散列值加密密码
var crypto = require('crypto');
//引入操作用户信息数据库的模型
var User = require('../models/user.js');
var PostMod = require('../models/post');

//登录状态检查,控制权限
//需要登录
function checkLogin (req, res, next) {
    if (!req.session.user) {
        req.flash('error', '未登录!');
        res.redirect('/login');
    }
    next();
}

//已登录访问登录注册地址
function checkNotLogin (req, res, next) {
    if (req.session.user) {
        req.flash('error', '已登录!');
        res.redirect('back');
    }
    next();
}

//路由
module.exports = function (app) {
    //主页
    app.get('/', function (req, res) {
        //name 参宿为 null,获取所有博客
        PostMod.getAll(null, function (error, result) {
            if (error) {
                result = [];
            }
            res.render('index', {
                title  : '主页',
                user   : req.session.user,
                name   : req.session.user == null ? '' : req.session.user.name,
                blogArr: result,
                success: req.flash('success').toString(),
                error  : req.flash('error').toString(),
            });
        });
        
    });
    
    //注册
    app.get('/reg', checkNotLogin, function (req, res) {
        res.render('reg', {
            title  : '注册',
            user   : req.session.user,
            success: req.flash('success').toString(),
            error  : req.flash('error').toString(),
        });
    });
    app.post('/reg', checkNotLogin, function (req, res) {
        var name        = req.body.name,
            password    = req.body.password,
            password_re = req.body['password-repeat'];
        //检验用户两次输入的密码是否一致
        if (password_re != password) {
            req.flash('error', '两次输入的密码不一致!');
            return res.redirect('/reg');//返回注册页
        }
        //生成密码的 md5 值
        var md5      = crypto.createHash('md5'),
            password = md5.update(req.body.password).digest('hex');
        var newUser = new User({
            name    : name,
            password: password,
            email   : req.body.email,
        });
        //检查用户名是否已经存在
        User.get(newUser.name, function (err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            if (user) {
                req.flash('error', '用户已存在!');
                return res.redirect('/reg');//返回注册页
            }
            //如果不存在则新增用户
            newUser.save(function (err, user) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/reg');//注册失败返回主册页
                }
                req.session.user = user;//将用户信息存到session
                req.flash('success', '注册成功!');
                res.redirect('/');//注册成功后返回主页
                
            });
        });
    });
    
    //登录
    app.get('/login', checkNotLogin, function (req, res) {
        res.render('login', {
            title  : '登录',
            user   : req.session.user,
            success: req.flash('success').toString(),
            error  : req.flash('error').toString(),
        });
    });
    app.post('/login', checkNotLogin, function (req, res) {
        //生成密码的 md5 值
        var md5      = crypto.createHash('md5'),
            password = md5.update(req.body.password).digest('hex');
        //检查用户是否存在
        User.get(req.body.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在!');
                return res.redirect('/login');//用户不存在则跳转到登录页
            }
            //检查密码是否一致
            if (user.password != password) {
                req.flash('error', '密码错误!');
                return res.redirect('/login');//密码错误则跳转到登录页
            }
            //用户名密码都匹配后，将用户信息存入 session
            req.session.user = user;
            req.flash('success', '登陆成功!');
            res.redirect('/');//登陆成功后跳转到主页
        });
    });
    
    //上传文件
    app.get('/upload',checkLogin,function (req,res) {
        res.render('upload',{
            title:'上传文件',
            user:req.session.user,
            name:req.session.user == null ? '' : req.session.user.name,
            success:req.flash('success').toString(),
            error:req.flash('error').toString(),
        })
    })
    app.post('/upload',checkLogin,function (req,res) {
        req.flash('success', '文件上传成功!');
        res.redirect('/upload');
    })
    
    //发博客
    app.get('/post', checkLogin, function (req, res) {
        res.render('post', {
            title  : '发布',
            user   : req.session.user,
            name   : req.session.user == null ? '' : req.session.user.name,
            success: req.flash('success').toString(),
            error  : req.flash('error').toString(),
        });
    });
    app.post('/post', checkLogin, function (req, res) {
        console.log(req.body);
        var artical = new PostMod({
            name   : req.session.user.name,
            title  : req.body.title,
            content: req.body.content,
        });
        artical.save(function (error, articalData) {
            if (error) {
                req.flash('error', error);
                return res.redirect('/post');
            }
            console.log(articalData);
            req.flash('success', '发布成功!');
            res.redirect('/');//注册成功后返回主页
            
        });
    });
    
    //用户博客
    app.get('/u/:name',function (req,res) {
         PostMod.getAll(req.params.name,function (error,blogArr) {
             if (error){
                 req.flash('error','获取该用户博客失败')
                 res.redirect('/')
             }
             res.render('user',{
                 name:req.session.user == null ? '' : req.session.user.name,
                 user:req.session.user,
                 title:req.params.name,
                 blogArr:blogArr,
                 success:req.flash('success').toString(),
                 error:req.flash('error').toString(),
             })
         })
     })
    
    //博客详情
    app.get('/u/:name/:day/:title',function (req,res) {
        PostMod.getOne(req.params.name,req.params.day,req.params.title,function (error,blog) {
            if (error){
               req.flash('error','获取博客详情失败')
                res.redirect('/')
            }
            res.render('blogDetial',{
                title:req.params.title,
                user:req.session.user,
                name:req.session.user == null ? '' : req.session.user.name,
                blog:blog,
                success:req.flash('success').toString(),
                error:req.flash('error').toString(),
                
            })
        })
    })
    
    //退出
    app.get('/logout', checkLogin, function (req, res) {
        req.session.user = null;
        req.flash('success', '登出成功!');
        res.redirect('/');//登出成功后跳转到主页
    });
    
    app.get('/kaiQiangCaiPu',function (req,res) {
        res.render('cook')
    })
};