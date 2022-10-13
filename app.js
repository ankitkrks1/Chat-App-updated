const express = require("express");
const http = require("http");
const app = express();
const path = require("path");
const cors = require("cors");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

app.use(cors());
const publicPath = path.join(__dirname, "build");
// const publicPath = path.join(__dirname, "../client/public");

const port = process.env.PORT || 3001;

app.use(express.static(publicPath))
// app.get('/',(req,res)=>{
//   res.sendFile('./build/index.html')
// })

const server = http.createServer(app);

const { Server } = require("socket.io");
const room = ['1']
const io = new Server(server, {
  cors: {
    // origin: "http://localhost:3001",
    // origin: "http://192.168.29.238:3000",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize:1e8, // this will allow to share more than 1MB file i.e 1e8 amount
});

io.on("connection", (socket) => {
  console.log("new connection!", socket.id);

  socket.on("user", (data, callback) => {

    if(data.room === ""){
      data.room = room[Math.floor(Math.random()*room.length)]
    }else{
      room.push(data.room)
    }
    
    const { error, user } = addUser({
      id: socket.id,
      username: data.user,
      room: data.room,
    });
    if (error) {
      return callback(error);
    }
    socket.join(data.room);
    // console.log(data);
    // Admin msg for new user join to other users
    socket.broadcast
      .to(data.room)
      .emit("msgList", {
        user: "Admin",
        room: data.room,
        msg: `${data.user} has join`,
        audioURL:'',
        fileURI:''
      });
    io.to(user.room).emit("online", getUsersInRoom(data.room));
  });

  socket.on('newMsg',data=>{
    socket.to(data.room).emit('msgList',data)
  })
  socket.on('send-audio',(room,audioURL)=>{
    console.log(room,audioURL)
    socket.to(room).emit('receive-audio',audioURL)
  })

  socket.on("disconnect", () => {
    console.log("disconnected");
    const user = removeUser(socket.id)

    if (user) {
        io.to(user.room).emit('msgList', {
          user: "Admin",
          room: user.room,
          msg: `${user.username} has Left`,
          audioURL:"",
          fileURI:''
        })
        io.to(user.room).emit('online', getUsersInRoom(user.room))
    }
  });
});

server.listen(port, () => {
  console.log(`server is up ${port}`);
  // console.log(publicPath);
});
