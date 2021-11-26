const socket = io("/");
console.log(socket);
socket.on("wait", (data) => setStatusMessage(data.message));

socket.on("user-count", (data) => {
  // console.log("Getting count:", data.length);
});
socket.on("found", (data) => {
  setIsConnected(true);
  setStatusMessage(data.message);
  setRoomId(data.room);
});
socket.on("stranger-disconnected", (data) => {
  setStatusMessage(data.message);
  setIsConnected(false);
});
socket.on("create-message", (data) => {
  setInboxMessages([...inboxMessages, data]);
});

socket.on("stranger-typing", (data) => {
  console.log("Started typing");
  setStatusMessage("Stranger typing");
});
socket.on("stranger-not-typing", (data) => {
  setStatusMessage("");
});

let isConnected = false;
const handleNewChat = () => {
  if (isConnected) {
    socket.emit("chat-stopped-by-user");

    isConnected = true;
    setStatusMessage("You disconnected.");
  } else {
    socket.emit("new-chat");
    // $('#status-msg').
  }
};
