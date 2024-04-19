const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuid } = require("uuid");
const io = require("socket.io")(server);
const cors = require("cors");
let onlineUsers = [];
let availableUsers = [];
let inboxes = [];
let Q = [];
let room = {};
app.use(cors());
app.set("view engine", "ejs");
const removeUser = (client) => {
  const index = availableUsers.findIndex((socket) => socket.id == client.id);
  availableUsers.splice(index, 1);
};
// app.use(express.static("public"));
// app.get("/", (req, res) => {
//   res.render("index");
// });

io.on("connection", (socket) => {
  console.log("***************************************");
  let client = socket;

  console.log("New client connected", inboxes);
  console.log("Socket:", socket.id);
  //   onlineUsers.push({ socket: socket, paired: false });
  availableUsers.push(socket);
  socket.emit("user-count", { length: availableUsers.length });
  socket.broadcast.emit("user-count", { length: availableUsers.length });

  socket.on("get-user-count", () => {
    socket.emit("user-count", { length: availableUsers.length });
  });
  let resolveAfter5Seconds = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("resolved");
      }, 5000);
    });
  };
  // const checkForStrangers = async (params) => {
  //   console.log("Join Room");
  //   // console.log(io.sockets.adapter.rooms);
  //   let delay = await resolveAfter5Seconds();
  //   let nonPairedInbox = inboxes.filter((inbox) => inbox.status == false);
  //   // console.log("Non Paired Inbox", nonPairedInbox);

  //   if (!(nonPairedInbox.length == 0)) {
  //     let selectedInbox = nonPairedInbox[0];

  //     socket.join(selectedInbox?.roomId);
  //     let indexOfSelectedInbox = inboxes.indexOf(selectedInbox);
  //     inboxes[indexOfSelectedInbox].status = true;
  //     socket.room = selectedInbox?.roomId;
  //     socket.emit("found", {
  //       message: "You connected to a stranger",
  //       room: selectedInbox?.roomId,
  //     });
  //     socket.broadcast.emit("found", {
  //       message: "You connected to a stranger",
  //       room: selectedInbox?.roomId,
  //     });
  //   } else {
  //     console.log("Creating Room");
  //     let roomId = uuid();
  //     inboxes.push({ roomId: roomId, status: false });

  //     socket.join(roomId);
  //     socket.room = roomId;
  //     console.log("in join", client.room);
  //   }

  //   // console.log("Non Paired Inbox-After", nonPairedInbox);
  // };
  const checkLoner = (socket) => {
    if (Q.length > 0) {
      let lone = Q.pop();
      let roomId = socket.id + "#" + lone.id;
      socket.join(roomId);
      lone.join(roomId);
      socket.emit("found", {
        message: "You connected to a stranger",
        room: roomId,
      });
      lone.emit("found", {
        message: "You connected to a stranger",
        room: roomId,
      });

      room[socket.id] = roomId;
      room[lone.id] = roomId;
    } else {
      Q.push(socket);
    }
  };
  socket.on("new-chat", () => {
    socket.emit("wait", { message: "Connecting to stranger" });
    checkLoner(socket);
  });
  socket.on("stopped-connecting", () => {
    console.log("Before", Q);
    let index = Q.findIndex((item) => item.id == socket.id);
    Q.splice(index, 1);
    console.log("After", Q);
  });
  socket.on("send-message", (data) => {
    console.log("sending", data.roomId);
    data.type = "incoming";

    socket.to(data.roomId).emit("create-message", data);
  });

  socket.on("typing", (data) => {
    socket.to(data.roomId).emit("stranger-typing");
  });

  socket.on("not-typing", (data) => {
    console.log("Not typing hitted");
    socket.to(data.roomId).emit("stranger-not-typing");
  });

  // const onChatStop = (params) => {
  //   let index = inboxes.findIndex((room) => room.roomId == client.room);
  //   console.log("Inside remove", socket.room);
  //   if (index >= 0) {
  //     if (inboxes[index].status == true) {
  //       io.sockets.to(socket.room).emit("stranger-disconnected", {
  //         message: "Stranger disconnected.Click New chat to find new stranger",
  //       });
  //       inboxes.splice(index, 1);
  //     } else inboxes.splice(index, 1);
  //   }
  // };

  const stopChat = (socket) => {};

  socket.on("chat-stopped-by-user", () => {
    console.log("Chat Stop");
    let clientRoom = room[socket.id];
    socket.broadcast.to(clientRoom).emit("stranger-disconnected", {
      message: "Stranger disconnected.Click New chat to find new stranger",
    });
    console.log("chat-stopped-by-user", room);
    // stopChat();
    // onChatStop();

    // socket.broadcast.emit("user-count", { length: onlineUsers.length });
  });

  socket.on("disconnect", () => {
    removeUser(socket);
    // onChatStop();
    console.log("disconnect", Q);
    let clientRoom = room[socket.id];
    socket.broadcast.to(clientRoom).emit("stranger-disconnected", {
      message: "Stranger disconnected.Click New chat to find new stranger",
    });
  });
});

server.listen(process.env.PORT || 3030, () => {
  console.log("Server stared on 3030");
});
