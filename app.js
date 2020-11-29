var express                 = require("express"),
    mongoose                = require("mongoose"),
    passport                = require("passport"),
    bodyParser              = require("body-parser"),
    User                    = require("./models/user"),
    LocalStrategy           = require("passport-local"),
    passportLocalMongoose   = require("passport-local-mongoose"),
    meeting                 =require("./models/meeting"),
    http                    =require("http"),
    socketio                =require("socket.io"),
     _                      =require("lodash");
    
var app = express();
const server=http.createServer(app); 
const io=socketio(server);

//peerjs include
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true
});
//;
//peerjs used 
app.use('/peerjs', peerServer);
//;

var port=process.env.PORT||3000;
//mongodb+srv://sam:samsingh@cluster0-znal8.mongodb.net/meet?retryWrites=true&w=majority
mongoose.connect(process.env.MONGODB_URI||"mongodb://localhost/speechdb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
});
mongoose.Promise = global.Promise;

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}));
app.use(require("express-session")({
    secret:"sid and sam rock",
    resave: false,
    saveUninitialized: false
}));

app.set('view engine','ejs');
//
app.use(passport.initialize());
app.use(passport.session());
// 
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use("/public", express.static("public"));


 //socket
//  var users={};
//  var susers={};
 
//   io.on('connection', function (socket) {
  
   
//      users[ socket.handshake.query.loggeduser] =socket.id
//      susers[socket.id ] =socket.handshake.query.loggeduser
//      console.log(users);
//      console.log(socket.handshake.query.meeting_id)
//       socket.join(socket.handshake.query.meeting_id);
//     //   socket.on('disconnecting', () => {
//     //    // const rooms = Object.keys(socket.rooms);
//     //     // the rooms array contains at least the socket ID
//     //     var room = io.sockets.adapter.rooms[socket.handshake.query.meeting_id];
//     //     console.log(room);
//     //        io.to(socket.handshake.query.meeting_id).emit('someone_left',{room_data:room,decode:susers});
 

//     //   })
//     var room = io.sockets.adapter.rooms[socket.handshake.query.meeting_id];
//     console.log(room);
//  //    var x=[];
//  //    for(var i=0;i<room.length;++i){x.push(susers[room.sockets[i]])}       
//        io.to(socket.handshake.query.meeting_id).emit('someone_joined',{room_data:room,decode:susers});
//       socket.on('disconnect', () => {    
           
//         delete users[socket.handshake.query.loggeduser];
//         delete   susers[socket.id ];
//         console.log(users);
//         delete socket; 
//         var room = io.sockets.adapter.rooms[socket.handshake.query.meeting_id];
//         console.log(room);
//            io.to(socket.handshake.query.meeting_id).emit('someone_left',{room_data:room,decode:susers}); 
//        });
      
//     socket.on("speaking",function(data){
//         io.in(socket.handshake.query.meeting_id).emit('other_listen', {
//            msg:data.msg,
//            current_speaker:data.current_speaker
//         })
//     })

    
  
    
//  })

 var users={};
 var susers={};
 //@issue same values of socketio for zoom and speak
io.on('connection', socket => {
    //zoom code
    socket.on('join-room', (roomId, userId) => {
      socket.join(roomId)
      socket.to(roomId).broadcast.emit('user-connected', userId);
      // messages
      socket.on('message', (data) => {
        //send message to the same room
        io.to(roomId).emit('createMessage', data)
    }); 
  
      socket.on('disconnect', () => {
        socket.to(roomId).broadcast.emit('user-disconnected', userId)
      })
    })


    //speak code
         users[ socket.handshake.query.loggeduser] =socket.id
     susers[socket.id ] =socket.handshake.query.loggeduser
     console.log(users);
     console.log(socket.handshake.query.meeting_id)
      socket.join(socket.handshake.query.meeting_id);
   
    var room = io.sockets.adapter.rooms[socket.handshake.query.meeting_id];
    console.log(room);
     
       io.to(socket.handshake.query.meeting_id).emit('someone_joined',{room_data:room,decode:susers});
      socket.on('disconnect', () => {    
           
        delete users[socket.handshake.query.loggeduser];
        delete   susers[socket.id ];
        console.log(users);
        delete socket; 
        var room = io.sockets.adapter.rooms[socket.handshake.query.meeting_id];
        console.log(room);
           io.to(socket.handshake.query.meeting_id).emit('someone_left',{room_data:room,decode:susers}); 
           
       });
      
    socket.on("speaking",function(data){
        io.in(socket.handshake.query.meeting_id).emit('other_listen', {
           msg:data.msg,
           current_speaker:data.current_speaker
        })
    })



  })






app.get("/",function(req,res){
    res.render("signup");
});

app.get("/meeting",isLoggedIn, function(req, res){
    meeting.find({ $or: [{joiner:req.user.username},  {creator: req.user.username}] } ,function(err,doc){
        if(err){return res.send(err)}
        else {   res.render("meeting",{username:req.user.username,meeting:doc});}
    })
 
});
app.post("/meetings",isLoggedIn, function(req, res){
   // res.render("meeting",{username:req.user.username});
   var new_meeting = new meeting({
   creator:req.user.username,
   name:req.body.meeting_name,
   joiner:[]
  });
  new_meeting.save(function(err,result){
      if(err){return res.send(err)}
      else{res.redirect("/meeting")}
    });

});
app.post("/join",isLoggedIn, function(req, res){
    // res.render("meeting",{username:req.user.username});
    meeting.find({ "joiner": req.user.username } ,function(err,doc){
        if(err) return res.send(err);
        else if(_.isEmpty(doc)) {
                        meeting.findByIdAndUpdate(req.body.meeting_id,{ "$push": { "joiner": req.user.username } },function(err,doc){
                            if(err) return res.send(err);
                            else if(_.isEmpty(doc)) return res.send("meeting not exist");
                            else {
                            res.redirect("/conversation/"+req.body.meeting_id)
                            }
                        })
        }
        else {
          res.redirect("/conversation/"+req.body.meeting_id);
        }
    })

   
 
 });

 app.get("/conversation/:id",isLoggedIn,function(req,res){
   res.render("conversation",{username:req.user.username,roomId: req.params.id});
 });
// Auth Routes


//handling user sign up
app.post("/register", function(req, res){
User.register(new User({username:req.body.username}),req.body.password, function(err, user){
       if(err){
            console.log(err);
            return res.render('signup');
        } //user stragety
        passport.authenticate("local")(req, res, function(){
            res.redirect("/meeting"); //once the user sign up
       }); 
    });
});

// Login Routes

app.get("/login", function(req, res){
    res.render("login");
})

// middleware
app.post("/login", passport.authenticate("local",{
    successRedirect:"/meeting",
    failureRedirect:"/login"
}),function(req, res){
    res.send("User is "+ req.user.id);
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});


function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}

server.listen(port, function(){
    console.log("connect!");
});