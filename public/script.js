document.addEventListener('DOMContentLoaded', () => {
    // initializing variables
    const socket = io();

    // show default screen (login)
    displayLoginScreen();

    // socket login events needed
    socket.on('create-room-successful', (username, roomCode) => {
        displayChatScreen(username, roomCode);
    })

    socket.on('create-room-failed', () => {
        alert('room creation failed');
    });

    socket.on('join-room-successful', (username, roomCode) => {
        displayChatScreen(username, roomCode);
    });

    socket.on('join-room-failed', (message) => {
        alert(message);
    });

    // socket chat events needed
    socket.on('leave-room-successful', (username, roomCode) => {
        displayLoginScreen(username, roomCode);
    });

    socket.on('leave-room-failed', () => {
        alert('leave room failed');
    });

    socket.on('message-from-server', (username, message, id) => {
        const messageContainer = document.createElement('div');
        const latestMessage = document.querySelector('#message-list li:last-child');
        const usernameOfLatestMessage = latestMessage.classList.contains('notification') ? '' : latestMessage.querySelector('.username-container').textContent;

        if (usernameOfLatestMessage && usernameOfLatestMessage === username) {
            messageContainer.textContent = message;
            messageContainer.classList.add('message-container');
            latestMessage.appendChild(messageContainer);
        } else {
            const messageItem = document.createElement('li');
            const isMyMessage = socket.id === id;
            const usernameContainer = document.createElement('div');

            usernameContainer.textContent = username;
            usernameContainer.classList.add('username-container');
            messageContainer.textContent = message;
            messageContainer.classList.add('message-container');
            messageItem.classList.add(isMyMessage ? 'my-message' : 'their-message');
            messageItem.appendChild(usernameContainer);
            messageItem.appendChild(messageContainer);
            document.getElementById('message-list').appendChild(messageItem);
        }

        messageContainer.scrollIntoView()
    });

    socket.on('create-room-notification', (username, roomCode, userList) => {
        handleNotification(username, roomCode, userList, 'created');
    });
    socket.on('join-room-notification', (username, roomCode, userList) => {
        handleNotification(username, roomCode, userList, 'joined');
    });
    socket.on('leave-room-notification', (username, roomCode, userList) => {
        handleNotification(username, roomCode, userList, 'left');
    });

    function handleNotification (username, roomCode, userList, action) {
        const messageItem = document.createElement('li');
        const userItem = document.createElement('li');
        const newUserList = userList.filter(user => user.id !== socket.id);

        messageItem.textContent = `${username} has ${action} room ${roomCode}`;
        messageItem.classList.add('notification');
        userItem.textContent = 'Me';
        document.getElementById('message-list').appendChild(messageItem);
        document.getElementById('room-code').textContent = `Room ${roomCode}`;
        document.getElementById('users-online').innerHTML = '';
        document.getElementById('users-online').appendChild(userItem);

        newUserList.forEach(user => {
            const userItem = document.createElement('li');

            userItem.textContent = user.username;
            document.getElementById('users-online').appendChild(userItem);
        })

        messageItem.scrollIntoView();
    }

    // display functions
    function displayLoginScreen (username = "", roomCode = "") {
        document.getElementById('output').innerHTML = `
            <div id="login">
                <h1>Chat demo</h1>
                <form id="login-form" autocomplete="off">
                    <input type="text" id="username" placeholder="Create a username" maxlength="12"/>
                    <input type="text" id="room-code" class="is-valid" placeholder="Room code (leave empty to create room)" maxlength="4"/>
                    <input type="submit" id="enter" value="Create" />
                </form>
            </div>
        `;

        const usernameField = document.getElementById('username');
        const roomCodeField = document.getElementById('room-code');
        const enterButton = document.getElementById('enter');
        const loginForm = document.getElementById('login-form');

        usernameField.oninput = () => {
            usernameField.classList.remove('is-valid');
            usernameField.classList.remove('is-invalid');

            if (usernameField.value.match(/[0-9a-zA-Z]{4,12}/) && usernameField.value.match(/[0-9a-zA-Z]{4,12}/)[0] === usernameField.value) {
                usernameField.classList.add('is-valid');
            } else {
                usernameField.classList.add('is-invalid');
            }
        }

        roomCodeField.oninput = () => {
            roomCodeField.classList.remove('is-valid');
            roomCodeField.classList.remove('is-invalid');

            if (roomCodeField.value.match(/[0-9]{4}/) && roomCodeField.value.match(/[0-9]{4}/)[0] === roomCodeField.value) {
                roomCodeField.classList.add('is-valid');
            } else if (!roomCodeField.value) {
                roomCodeField.classList.add('is-valid');
            } else {
                roomCodeField.classList.add('is-invalid');
            }

            if (roomCodeField.value) {
                enterButton.value = "Join";
            } else {
                enterButton.value = "Create";
            }
        }

        loginForm.onsubmit = (e) => {
            e.preventDefault();

            if (usernameField.classList.contains('is-valid') && !roomCodeField.value) {
                socket.emit('create-room-attempt', usernameField.value);
            } else if (usernameField.classList.contains('is-valid') && roomCodeField.classList.contains('is-valid')) {
                socket.emit('join-room-attempt', usernameField.value, roomCodeField.value);
            }
        }

        if (username && roomCode) {
            const inputEvent = new Event('input');

            usernameField.value = username;
            usernameField.dispatchEvent(inputEvent);
            roomCodeField.value = roomCode;
            roomCodeField.dispatchEvent(inputEvent);
        }
    }

    function displayChatScreen () {
        document.getElementById('output').innerHTML = `
            <div id="chat">
                <div id="chat-sidebar">
                    <div class="sidebar-menu">
                        <button id="leave-room">Leave room</button>
                        <button id="hide-sidebar">
                            <i class="fa fa-times" aria-hidden="true"></i>
                        </button>
                    </div>
                    <h2>People in this room:</h2>
                    <ul id="users-online"></ul>
                </div>
                <div class="content">
                    <div class="content-menu">
                        <h2 id="room-code"></h2>
                        <button id="show-sidebar">
                            <i class="fa fa-bars" aria-hidden="true"></i>
                        </button>
                    </div>
                    <ul id="message-list"></ul>
                    <form id="message-form" autocomplete="off">
                        <input type="text" id="message-content" placeholder="Message"/>
                        <input type="submit" id="send-message" value="Send" />
                    </form>
                </div>
            </div>
        `;

        const leaveRoomButton = document.getElementById('leave-room');
        const messageContentField = document.getElementById('message-content');
        const messageForm = document.getElementById('message-form');
        const showSidebarButton = document.getElementById('show-sidebar');
        const hideSidebarButton = document.getElementById('hide-sidebar');
        const chatSidebar = document.getElementById('chat-sidebar');

        leaveRoomButton.onclick = () => {
            socket.emit('leave-room-attempt');
        }

        messageForm.onsubmit = (e) => {
            e.preventDefault();

            if (messageContentField.value) {
                socket.emit('message-to-server', messageContentField.value);
                messageContentField.value = '';
            }
        }

        showSidebarButton.onclick = () => {
            chatSidebar.classList.add('active');
        }

        hideSidebarButton.onclick = () => {
            chatSidebar.classList.remove('active');
        }
    }
})