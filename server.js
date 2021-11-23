const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuid } = require("uuid");
const io = require("socket.io")(server);
const cors = require("cors");
let onlineUsers = [];
let availableUsers = [];
let inboxes = [];

app.use(cors());
app.set("view engine", "ejs");
const removeUser = (client) => {
  const index = availableUsers.findIndex((socket) => socket.id == client.id);
  availableUsers.splice(index, 1);
};
// app.get("/", (req, res) => {
//   res.render("index");
// });
io.on("connection", (socket) => {
  let client = socket;
  console.log("on connection", inboxes);
  console.log("New client connected");
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
  const checkForStrangers = async (params) => {
    console.log(io.sockets.adapter.rooms);
    let delay = await resolveAfter5Seconds();
    let nonPairedInbox = inboxes.filter((inbox) => inbox.status == false);
    console.log(nonPairedInbox);

    if (!nonPairedInbox.length == 0) {
      let selectedInbox = nonPairedInbox[0];

      socket.join(selectedInbox?.roomId);
      let indexOfSelectedInbox = inboxes.indexOf(selectedInbox);
      inboxes[indexOfSelectedInbox].status = true;
      socket.room = selectedInbox?.roomId;
      socket.emit("found", {
        message: "Found user",
        room: selectedInbox?.roomId,
      });
      socket.broadcast.emit("found", {
        message: "You connected to a stranger",
        room: selectedInbox?.roomId,
      });
    } else {
      let roomId = uuid();
      inboxes.push({ roomId: roomId, status: false });
      console.log(roomId);
      socket.join(roomId);
      socket.room = roomId;
      console.log("in hoin", client.room);
    }
  };

  socket.on("new-chat", () => {
    socket.emit("wait", { message: "Connecting to stranger" });

    checkForStrangers();
  });

  socket.on("send-message", (data) => {
    console.log("sending");
    data.type = "incoming";
    socket.to(data.roomId).emit("create-message", data);
  });

  socket.on("typing", (data) => {
    socket.to(data.roomId).emit("stranger-typing");
  });

  socket.on("not-typing", (data) => {
    socket.to(data.roomId).emit("stranger-not-typing");
  });
  const onChatStop = (params) => {
    let index = inboxes.findIndex((room) => room.roomId == client.room);

    if (index >= 0) {
      if (inboxes[index].status == true) {
        console.log("inside remove", socket.room);
        io.sockets.to(socket.room).emit("stranger-disconnected", {
          message: "Stranger disconnected.Click New chat to find new stranger",
        });
        inboxes.splice(index, 1);
      } else inboxes.splice(index, 1);
    }
  };

  socket.on("chat-stopped-by-user", () => {
    console.log("Chat Stop");

    console.log("on remove", socket.room);

    onChatStop();

    socket.broadcast.emit("user-count", { length: onlineUsers.length });
  });

  socket.on("disconnect", () => {
    removeUser(socket);
    onChatStop();
  });
});

server.listen(process.env.PORT || 3030, () => {
  console.log("Server stared on 3030");
});
