"use strict";
/**
 * Manages the chat client's frontend.
 *
 * TODO: Make a mobile version - Move the profile/channel selection to the top, make channel selection collapsible. Make sure that scrolling isn't possible when a keyboard is up
 */
const apiURL =
  "https://script.google.com/macros/s/AKfycbyLRxXHo2kWTYFGI47gCNI8EDkpmB6axFVeJKShtDYJm5fC28CPDwaTna0S_gA9Srk/exec";

let openChatName;

// Toggle chat list
function toggleChatList() {
  const obj = document.getElementById("chatListWrapper");

  console.log(obj.style.display);

  const isOpen = obj.style.display == "block";

  obj.style.display = isOpen ? "none" : "block";
}

// Reload the channel view to show all channels
function reloadChats() {
  console.log("Reloading chat list");

  // Clear the chat list
  const chats = document.getElementById("chatList");
  const loader = document.getElementById("chatListLoading");
  chats.innerHTML = "";
  loader.style.display = "flex";

  fetch(`${apiURL}?action=getChats`)
    .then((result) => result.json())
    .then((json) => {
      loader.style.display = "none";
      chats.innerHTML = "";
      for (const chatName of json.chats) {
        // Add a new chat button and add a listener for opening the chat
        const obj = document.createElement("div");
        obj.innerText = chatName;
        obj.onclick = () => openChat(chatName);
        chats.appendChild(obj);
      }
    });
}

// Open a chat with a given name
function openChat(name) {
  console.log("Opening " + name);
  openChatName = name;

  // Disable message view and enable loading view
  const messages = document.getElementById("messageList");
  const loadingView = document.getElementById("messagesLoading");
  messages.style.display = "none";
  loadingView.style.display = "flex";

  // Get the last 50 messages from this channel
  fetch(`${apiURL}?action=getMessages&chat=${name}&number=50`)
    .then((result) => result.json())
    .then((json) => {
      console.log(json);

      // Populate the message view
      populateMessageList(json.messages);

      // Disable loading and enable chat
      messages.style.display = "block";
      loadingView.style.display = "none";
    });
}

// Send the message stored in the message composer
function sendMessage() {
  const username = document.getElementById("usernameInput").value;
  let message = document.getElementById("newMessage").value.trim();

  console.log(message);

  // Replace the \n:s with &e& in order to avoid problems with sending line breaks
  message = message.replaceAll("\n", "%e%");

  // TODO: If the username or message isn't set, show a warning and run a red emphasis animation on the right element

  // If no username is set, send a message
  if (!username) {
    console.log("No username set!");
    sendWarningAlert("Du har inte valt ett användarnamn!");
    const obj = document.getElementById("usernameInput");
    obj.classList.add("redBlink");
    setTimeout(() => obj.classList.remove("redBlink"), 1000);
    return;
  }
  // If no chat is open, complain
  if (!openChatName) {
    console.log("No chat selected!");
    sendWarningAlert("Du har inte valt en chatt att skriva i!");
    const obj = document.getElementById("chatList");
    obj.classList.add("redBlink");
    setTimeout(() => obj.classList.remove("redBlink"), 1000);
    return;
  }
  // If no message is set, tell the user
  if (!message) {
    console.log("No message written!");
    sendWarningAlert("Du har inte skrivit något meddelande!");
    const obj = document.getElementById("newMessage");
    obj.classList.add("redBlink");
    setTimeout(() => obj.classList.remove("redBlink"), 1000);
    return;
  }

  // Clear the message container
  document.getElementById("newMessage").value = "";

  // Post the message
  fetch(
    `${apiURL}?action=sendMessage&chat=${openChatName}&sender=${username}&message=${message}`
  )
    .then((response) => response.json())
    .then((json) => console.log(json));

  // Add the message to the message queue
  document.getElementById("messageList").appendChild(
    constructMessage({
      sender: username,
      message: message,
      date: new Date(),
    })
  );
  // Skip any currently active reload to avoid removing the message just sent
  skipReloadResult = true;
}

// Fill the message list with the messages present in the provided list
function populateMessageList(list) {
  const messages = document.getElementById("messageList");

  // Clear the message list view
  messages.innerHTML = "";
  const header = document.createElement("h2");
  header.innerText = openChatName;
  messages.appendChild(header);

  // Readd messages (with senders and timestamps)
  for (const { sender, message, timestamp } of list) {
    // Get the date in ISO format
    const d = new Date(timestamp);

    // Add the message to the message list
    messages.appendChild(
      constructMessage({
        sender: sender,
        message: message,
        date: d,
      })
    );
  }
}

// Construct a message, give back the HTML object
function constructMessage({ sender, message, date }) {
  // Format time
  const time = date.toISOString().split("T")[0];

  // Replace %e% with a line break
  message = message.replaceAll("%e%", "\n");

  // Create and return object
  const obj = document.createElement("div");
  obj.innerText = `[${time}] ${sender}: ${message}`;
  return obj;
}

// A function for giving a small alert prompt to the user
function sendWarningAlert(text) {
  const obj = document.getElementById("warningToast");
  obj.innerText = text;
  obj.style.bottom = "20%";
  setTimeout(() => (obj.style.bottom = "-20%"), 800 + 50 * text.length);
}

// This function runs every 10s to reload all the messages for the open chat
let skipReloadResult = false;
function updateCurrentChat() {
  console.log("Updating chat");
  if (openChatName) {
    fetch(`${apiURL}?action=getMessages&chat=${openChatName}&number=50`)
      .then((result) => result.json())
      .then((json) => {
        if (skipReloadResult) {
          skipReloadResult = false;
          return;
        }
        // Reload the messages
        populateMessageList(json.messages);
      });
  }
  setTimeout(updateCurrentChat, 10000);
}
setTimeout(updateCurrentChat, 10000);

// On page load, refresh the channel view
reloadChats();

// Create a listener for pressing enter in a text area in order to send a message
document.addEventListener("keydown", (e) => {
  if (e.code != "Enter" || e.shiftKey) return;
  e.preventDefault();
  sendMessage();
});
