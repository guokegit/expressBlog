/**
 *
 * 2017/8/25
 * 作者：郑丹红
 */
 
//引入数据库
var mongodb = require('./db');
var markdown=require('markdown').markdown;

//构造对象
function Post (blog) {
    this.name = blog.name;
    this.title = blog.title;
    this.content = blog.content;
}

//导出
module.exports = Post;

//实例对象存储方法
Post.prototype.save = function (callback) {
    //获取当前时间
    var date = new Date();
    //多种时间格式(拓展)
    var time = {
        date:date,
        year : date.getFullYear(),
        month : date.getFullYear() + "-" + (date.getMonth() + 1),
        day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    };
    //获取存储内容
    var postMessage={
        name:this.name,
        title:this.title,
        content:this.content,
        time:time,
    }
    //打开数据库
    mongodb.open(function (error,db) {
        if (error){
            return callback(error);
        }
        //读取 posts 集合(数据库已打开)
        db.collection('posts',function (err,collection) {
            if (err){
                mongodb.close();//关闭数据库
                return callback(err);
            }
            //将数据插入 posts 集合
            collection.insert(postMessage,{safe:true},function (er) {
                mongodb.close();
                if (er){
                    return callback(er);
                }
                return callback(null,postMessage)//callback 回调函数第一个参数为 error,第二个为存储成功的数据
            })
        })
    })
};

//传 name 参数则获取一个人所有博客,不传则获取已存储的所有人的博客数据
Post.getAll=function (name,callback) {
    //打开数据库
    mongodb.open(function (error,db) {
        if (error){
           return callback(error)
        }
        //读取posts集合
        db.collection('posts',function (err,collection) {
            if (err){
               mongodb.close();
               return callback(err);
            }
            
            //查询参数
            var query={};
            if (name){
                query.name=name;
            }
            //根据 query 对象查询
            collection.find(query).sort({time:-1}).toArray(function (er,result) {
                mongodb.close();
                if (er){
                   return callback(er) ;
                }
                //把结果的内容项(markdown)转化为 html 返回
                result.forEach(function (markdownResult) {
                    markdownResult.content=markdown.toHTML(markdownResult.content);
                })
                return callback(null,result)//成功,以数组形式返回查询数据
            })
        })
    })
}

//获取谋篇博客详情
Post.getOne=function (name,day,title,callback) {
    //打开数据库
    mongodb.open(function (error,db) {
        if (error){
            return callback(error);
        }
        //获取 post 集合
        db.collection('posts',function (err,collection) {
            if (err){
                mongodb.close()
                return callback(err);
            }
            //精确查找符合下列3个要求的一条数据
            collection.findOne({
                'name':name,
                'title':title,
                'time.day':day,
            },function (er,result) {
                mongodb.close();
                if (er){
                    return callback(er);
                }
                console.log(result)
                //markdown 格式的 content转化为 html
                result.content=markdown.toHTML(result.content)
                return callback(null,result);
            })
        })
    })
}
