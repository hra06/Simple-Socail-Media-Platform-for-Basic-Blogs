const express = require('express');
const session = require('express-session')
const MongoStore = require('connect-mongo')(session)
const flash = require('connect-flash')
const markdown = require('marked')
const csrf = require('csurf')
const app = express();
const sanitizeHTML = require('sanitize-html')

let sessionOptions = session({
    secret:"JavaScript is sooooooooooo cool",
    store: new MongoStore({client: require('./db')}),
    resave:false,
    saveUninitialized:false,
    cookie:{
        maxAge: 1000*60*60*24,
        httpOnly:true
    }
})


app.use(sessionOptions)
app.use(flash())

app.use(function(req,res,next){
    // make our mark down function from withnin ejs
    res.locals.filterUserHTML = function(content){
        return sanitizeHTML(markdown(content), { allowedAttributes:{}})
    }

    // make all error and sucees message available from all te,plates
    res.locals.errors = req.flash("errors")
    res.locals.success = req.flash("success")

    //make current user id availabe for the req objecr
    if(req.session.user){ req.visitorId = req.session.user._id} else {req.visitoId = 0}
    
    // make user session data from within view template
    res.locals.user = req.session.user
    next()
})

const router = require('./router')

app.use(express.urlencoded({extended:false}))
app.use(express.json())

app.use(express.static('public'))
app.set('views','views')
app.set('view engine', 'ejs')

app.use(csrf())

app.use(function(req,res,next){
    res.locals.csrfToken = req.csrfToken()
    next()
})


app.use('/',router)

app.use(function(err,req,res,next){
    if(err){
        if(err.code=="EBADCSRFTOKEN"){
            req.flash('errors',"Cross site request forgery detected.")
            req.session.save(()=>res.redirect('/'))
        }else{
            res.render('404')
        }
    }

})

const server = require('http').createServer(app)

const io = require('socket.io')(server)

io.use(function(socket,next){
    sessionOptions(socket.request,socket.request.res,next)
})

io.on('connection', function(socket){
    if(socket.request.session.user){
        let user = socket.request.session.user

        socket.emit('welcome',{username:user.username,avatar:user.avatar})

        socket.on('chatMessageFromBrowser',function(data){
            socket.broadcast.emit('chatMessageFromServer',{message: sanitizeHTML(data.message,{allowedTags:[],allowedAttributes:[]}), username:user.username,avatar:user.avatar})
        })
    }
})

module.exports = server






















// markdown cheatcheet github must visit