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
        //获取起始页数
        var p = req.query.p ? parseInt(req.query.p) : 0;
        //name 参宿为 null,获取所有博客
        PostMod.getFive(null, p, function (error, limitblogArr, total) {
            if (error) {
                limitblogArr = [];
            }
            res.render('index', {
                title  : '主页',
                user   : req.session.user,
                name   : req.session.user == null ? '' : req.session.user.name,
                blogArr: limitblogArr,
                page   : p,
                isFirstPage:p==0,
                isLastPage:(p*5+limitblogArr.length)==total,
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
    app.get('/upload', checkLogin, function (req, res) {
        res.render('upload', {
            title  : '上传文件',
            user   : req.session.user,
            name   : req.session.user == null ? '' : req.session.user.name,
            success: req.flash('success').toString(),
            error  : req.flash('error').toString(),
        });
    });
    app.post('/upload', checkLogin, function (req, res) {
        req.flash('success', '文件上传成功!');
        res.redirect('/upload');
    });
    
    //修改图像
    app.get('/updateIcon', checkLogin, function (req, res) {
        res.render('updateIcon', {
            title  : '修改图像',
            user   : req.session.user,
            name   : req.session.user == null ? '' : req.session.user.name,
            success: req.flash('success').toString(),
            error  : req.flash('error').toString(),
        });
    });
    app.post('/updateIcon', checkLogin, function (req, res) {
        var icon = 'http://39.108.190.79:3389/uploads/' + req.files.file[0].originalname;
        var currentUser = req.session.user;
        console.log(req.files.file[0].originalname);
        PostMod.updateIcon(currentUser.name, icon, function (err) {
            req.session.user.icon = icon;
            req.flash('success', '图像修改成功!');
            res.redirect('/');
        });
    });
    
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
            icon   : req.session.user.icon,
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
    app.get('/u/:name', function (req, res) {
        var p = req.query.p ? parseInt(req.query.p) : 0;
        User.get(req.params.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在!');
                return res.redirect('/');
            };
            PostMod.getFive(req.params.name, p,function (error, blogArr,total) {
                if (error) {
                    req.flash('error', '获取该用户博客失败');
                    res.redirect('/');
                }
                res.render('user', {
                    name   : req.session.user == null ? '' : req.session.user.name,
                    user   : req.session.user,
                    title  : req.params.name + '的主页',
                    blogArr: blogArr,
                    page   : p,
                    isFirstPage:p==0,
                    isLastPage:(p*5+blogArr.length)==total,
                    success: req.flash('success').toString(),
                    error  : req.flash('error').toString(),
                });
            });
            
        })
    });
    
    //博客详情
    app.get('/u/:name/:day/:title', function (req, res) {
        PostMod.getOne(req.params.name, req.params.day, req.params.title, function (error, blog) {
            if (error) {
                req.flash('error', '获取博客详情失败');
                res.redirect('/');
            }
            res.render('blogDetial', {
                title  : req.params.title,
                user   : req.session.user,
                name   : req.session.user == null ? '' : req.session.user.name,
                blog   : blog,
                success: req.flash('success').toString(),
                error  : req.flash('error').toString(),
                
            });
        });
    });
    //发表评论
    app.post('/u/:name/:day/:title', checkLogin, function (req, res) {
        var currentUser = req.session.user;
        var date = new Date();
        var time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' +
            date.getHours() + ':' + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
        var commit = {
            commitMan    : currentUser.name,
            commitIcon   : currentUser.icon,
            commitTime   : time,
            commitContent: req.body.commitContent,
        };
        PostMod.addCommit(req.params.name, req.params.day, req.params.title, commit, function (error) {
            if (error) {
                req.flash('error', '评论失败');
                return res.redirect('back');
            }
            req.flash('success', '评论成功');
            res.redirect('back');
        });
    });
    
    //编辑个人博客
    app.get('/edit/:name/:day/:title', checkLogin, function (req, res) {
        var currentUser = req.session.user;
        PostMod.edit(currentUser.name, req.params.day, req.params.title, function (error, blog) {
            if (error) {
                req.flash('error').toString();
                return res.redirect('back');
            }
            res.render('edit', {
                title  : '编辑',
                user   : req.session.user,
                name   : req.session.user == null ? '' : req.session.user.name,
                blog   : blog,
                success: req.flash('success').toString(),
                error  : req.flash('error').toString(),
            });
        });
    });
    //保存编辑
    app.post('/edit/:name/:day/:title', checkLogin, function (req, res) {
        var currentUser = req.session.user;
        PostMod.update(currentUser.name, req.params.day, req.params.title, req.body.content, function (err) {
            var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
            if (err) {
                req.flash('error', err);
                return res.redirect(url);//出错！返回文章页
            }
            req.flash('success', '修改成功!');
            res.redirect(url);//成功！返回文章页
        });
    });
    
    //删除个人博客
    app.get('/remove/:name/:day/:title', checkLogin, function (req, res) {
        var currentUser = req.session.user;
        PostMod.remove(currentUser.name, req.params.day, req.params.title, function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '删除成功!');
            res.redirect('/');
        });
    });
    
    //退出
    app.get('/logout', checkLogin, function (req, res) {
        req.session.user = null;
        req.flash('success', '登出成功!');
        res.redirect('/');//登出成功后跳转到主页
    });
    
    //凯强菜谱
    app.get('/kaiQiangCaiPu', function (req, res) {
        res.render('cook');
    });
};