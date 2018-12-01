var express = require('express');
var bodyParser = require('body-parser');
var async = require('async');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var url = 'mongodb://127.0.0.1:27017';
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

// 设置响应头处理跨域问题
app.use(function (req, res, next) {
    res.set({
        'Access-Control-Allow-Origin': '*'
    })
    next();
})

/* ===================================登录注册================================== */

//登录请求   localhost:3000/api/login
app.post('/api/login', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据库连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        db.collection('user').find({
            username: username,
            password: password
        }).toArray(function (err, data) {
            if (err) {
                results.code = -1;
                results.msg = '查询失败';
            } else if (data.length <= 0) {
                results.code = -1;
                results.msg = '用户名或密码错误';
            } else {
                results.code = 0;
                results.msg = '登录成功';
                results.data = {
                    nickname: data[0].nickname,
                    username: data[0].username,
                    isAdmin: data[0].isAdmin,
                    _id: data[0]._id,
                }
            }
            client.close();
            res.json(results);
        })
    })
});

//注册请求
app.post('/api/register', function (req, res) {
    var name = req.body.username;
    var pwd = req.body.password;
    var nickname = req.body.nickname;
    var sex = req.body.sex;
    var age = parseInt(req.body.age);
    var isAdmin = req.body.isAdmin === '是' ? true : false;
    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据库连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        async.series([
            function (cb) {
                db.collection('user').find({ username: name }).count(function (err, num) {
                    if (err) {
                        cb(err)
                    } else if (num > 0) {
                        // 用户名已存在
                        cb(new Error('用户名已存在'));
                    } else {
                        // 用户名不存在,可以注册
                        cb(null);
                    }
                })
            },
            function (cb) {
                db.collection('user').insertOne({
                    username: name,
                    password: pwd,
                    nickname: nickname,
                    age: age,
                    sex: sex,
                    isAdmin: isAdmin
                }, function (err) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null);
                    }
                })
            }
        ], function (err, result) {
            if (err) {
                //注册失败
                results.code = -1;
                results.msg = '用户名已存在';
            } else {
                //注册成功
                results.code = 0;
                results.msg = '注册成功';
            }
            // 不管成功or失败，关闭
            client.close();
            res.json(results);
        })
    })
})

/* ===================================用户管理================================== */

//获取用户列表
app.get('/api/user/list', function (req, res) {
    var page = parseInt(req.query.page);
    var pageSize = parseInt(req.query.pageSize);
    var totalSize = 0;
    var totalPage = 0;
    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据库连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');

        async.series([
            function (cb) {
                db.collection('user').find().count(function (err, num) {
                    if (err) {
                        cb(err);
                    } else {
                        totalSize = num;
                        cb(null);
                    }
                })
            },
            function (cb) {
                db.collection('user').find().limit(pageSize).skip(page * pageSize - pageSize).toArray(function (err, data) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, data);
                    }
                })
            }
        ], function (err, result) {
            if (err) {
                results.code = -1;
                results.msg = err.message;
            } else {
                totalPage = Math.ceil(totalSize / pageSize);
                results.code = 0;
                results.msg = '查询成功';
                results.data = {
                    list: result[1],
                    totalPage: totalPage,
                    currentPage: page
                }
            }
            client.close();
            res.json(results)
        })
    })
})

//删除用户信息
app.get('/api/user/delete', function (req, res) {
    var username = req.query.username;
    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据库连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        db.collection('user').deleteOne({
            username: username
        }, function (err) {
            if (err) {
                //删除失败
                results.code = -1;
                results.msg = '删除失败';
            } else {
                //删除成功
                results.code = 0;
                results.msg = '删除成功';
            }
            client.close();
            res.json(results);
        })
    })
})

//搜索操作
app.get('/api/user/search', function (req, res) {
    var name = req.query.name;
    var filter = new RegExp(name);
    var results = {}
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据库连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        db.collection('user').find({
            nickname: filter
        }).toArray(function (err, data) {
            if (err) {
                results.code = -1;
                results.msg = '查询失败';
            } else {
                results.code = 0;
                results.msg = '查询成功';
                results.data = {
                    list: data
                }
            }
            client.close()
            res.json(results);
        })
    })
})

/* ===================================品牌管理================================== */

//获取品牌信息
app.get('/api/brand/list', function (req, res) {
    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据库连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        db.collection('brand').find().toArray(function (err, data) {
            if (err) {
                //查询失败
                results.code = -1;
                results.msg = '查询失败';
            } else {
                //查询成功
                results.code = 0;
                results.msg = '查询成功';
                results.data = {
                    list: data
                }
            }
            client.close();
            res.json(results);
        })
    })
})

//添加品牌信息
app.get('/api/brand/add', function (req, res) {
    var brandLogo = req.query.brandLogo;
    var brandName = req.query.brandName;
    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据库连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        db.collection('brand').insertOne({
            brandLogo: brandLogo,
            brandName: brandName
        }), function (err) {
            if (err) {
                results.code = -1;
                results.msg = '添加失败';
            } else {
                results.code = 0;
                results.msg = '添加成功';
            }
            client.close()
            res.json(results);
        }
    })
})

//删除品牌信息
app.get('/api/brand/delete', function (req, res) {
    var brandName = req.query.brandName;
    var results = {};
    MongoClient.connect(url, { useNewUrlParser: true }, function (err, client) {
        if (err) {
            results.code = -1;
            results.msg = '数据库连接失败';
            res.json(results);
            return;
        }
        var db = client.db('project');
        db.collection('brand').deleteOne({
            brandName: brandName
        }, function (err) {
            if (err) {
                //删除失败
                results.code = -1;
                results.msg = '删除失败';
            } else {
                //删除成功
                results.code = 0;
                results.msg = '删除成功';
            }
            client.close();
            res.json(results);
        })
    })
})


app.listen(3000);