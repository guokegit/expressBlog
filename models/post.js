/**
 *
 * 2017/8/25
 * 作者：郑丹红
 */
    
    //引入数据库
var mongodb = require('./db');
var markdown = require('markdown').markdown;

//构造对象
function Post (blog) {
    this.name = blog.name;
    this.icon=blog.icon;
    this.title = blog.title;
    this.content = blog.content;
}

//导出
module.exports = Post;

//实例对象存储方法(发表博客)
Post.prototype.save = function (callback) {
    //获取当前时间
    var date = new Date();
    //多种时间格式(拓展)
    var time = {
        date  : date,
        year  : date.getFullYear(),
        month : date.getFullYear() + '-' + (date.getMonth() + 1),
        day   : date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(),
        minute: date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()),
    };
    //获取存储内容
    var postMessage = {
        name   : this.name,
        icon   : this.icon,
        title  : this.title,
        content: this.content,
        time   : time,
        commits: [],
        
    };
    //打开数据库
    mongodb.open(function (error, db) {
        if (error) {
            return callback(error);
        }
        //读取 posts 集合(数据库已打开)
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();//关闭数据库
                return callback(err);
            }
            //将数据插入 posts 集合
            collection.insert(postMessage, {safe: true}, function (er) {
                mongodb.close();
                if (er) {
                    return callback(er);
                }
                return callback(null, postMessage);//callback 回调函数第一个参数为 error,第二个为存储成功的数据
            });
        });
    });
};

//传 name 参数则获取一个人所有博客,不传则获取已存储的所有人的博客数据
Post.getAll = function (name, callback) {
    //打开数据库
    mongodb.open(function (error, db) {
        if (error) {
            return callback(error);
        }
        //读取posts集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            
            //查询参数
            var query = {};
            if (name) {
                query.name = name;
            }
            //根据 query 对象查询
            collection.find(query).sort({time: -1}).toArray(function (er, result) {
                mongodb.close();
                if (er) {
                    return callback(er);
                }
                //把结果的内容项(markdown)转化为 html 返回
                result.forEach(function (markdownResult) {
                    markdownResult.content = markdown.toHTML(markdownResult.content);
                });
                return callback(null, result);//成功,以数组形式返回查询数据
            });
        });
    });
};

//一次获取十篇文章
Post.getTen = function(name, page, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            var query = {};
            if (name) {
                query.name = name;
            }
            //使用 count 返回特定查询的文档数 total
            collection.count(query,function (err,total) {
                if (err){
                    return callback(err)
                }
                //根据 query 对象查询，并跳过前 (page-1)*10 个结果，返回之后的 10 个结果
                collection.find(query,{skip:(page-1)*10,limit:10}).sort({time:-1}).toArray(function (err,limitBlogArr) {
                    if (err){
                        return callback(err)
                    }
                    limitBlogArr.forEach(function (blog) {
                        blog.content=markdown.toHTML(blog.content)//博客内容markdown转换成 html
                        blog.commits.forEach(function (commit) {// 评论 markdown 转换成 html
                            commit.commitContent=markdown.toHTML(commit.commitContent)
                        })
                    })
                    return callback(null,limitBlogArr,total)
                })
            })
        });
    });
};

//获取谋篇博客详情
Post.getOne = function (name, day, title, callback) {
    //打开数据库
    mongodb.open(function (error, db) {
        if (error) {
            return callback(error);
        }
        //获取 post 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //精确查找符合下列3个要求的一条数据
            collection.findOne({
                'name'    : name,
                'title'   : title,
                'time.day': day,
            }, function (er, result) {
                mongodb.close();
                if (er) {
                    return callback(er);
                }
                console.log(result);
                //markdown 格式的 content转化为 html
                if (result) {
                    result.content = markdown.toHTML(result.content);
                    result.commits.forEach(function (commit) {
                        commit.commitContent = markdown.toHTML(commit.commitContent);
                    });
                }
                return callback(null, result);
            });
        });
    });
};
//发表评论
Post.addCommit = function (name, day, title, commit, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //通过用户名、时间及标题查找文档，并把一条留言对象添加到该文档的 comments 数组里
            collection.update({
                'name'    : name,
                'time.day': day,
                'title'   : title,
            }, {
                $push: {'commits': commit},
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

//返回原始发表的内容（markdown 格式）
Post.edit = function (name, day, title, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //根据用户名、发表日期及文章名进行查询
            collection.findOne({
                'name'    : name,
                'time.day': day,
                'title'   : title,
            }, function (err, doc) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null, doc);//返回查询的一篇文章（markdown 格式）
            });
        });
    });
};

//更新一篇文章及其相关信息
Post.update = function (name, day, title, content, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //更新文章内容
            collection.update({//查找条件
                'name'    : name,
                'time.day': day,
                'title'   : title,
            }, {
                $set: {content: content}//更新内容
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

//修改图像
Post.updateIcon = function (name,icon, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('users', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //更新文章内容
            collection.update({//查找条件
                'name'    : name,
            }, {
                $set: {icon: icon}//更新内容
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

//删除一篇文章
Post.remove = function (name, day, title, callback) {
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //根据用户名、日期和标题查找并删除一篇文章
            collection.remove({
                'name'    : name,
                'time.day': day,
                'title'   : title,
            }, {
                w: 1//写入成功一次即返回,(这里指删除成功一条就返回)
            }, function (err) {
                mongodb.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};