const express = require('express');
const WebSocket = require('ws');

const port = process.env.PORT || 8080;
var app = express();

app.use(express.static('public'));

var rooms = [];

// Express stuff.
// app.get("/foobars", function(req, res) {
// 	res.sendStatus(200);
// });

// app.post("/foobars", function(req, res) {
// 	// create some DB record here
// 	res.sendStatus(201);
// 	// broadCastToAllClients(something);
// 	// can broad cast from anywhere!!!
// })

var server = app.listen(port, function() {
	console.log("server is listening on port", port);
});


// Websockets stuff.
const wss = new WebSocket.Server({ server: server });

function createNewRoom(newClient, roomID, roomText) {
	rooms.push({
		owner: newClient,
		roomID: roomID,
		roomText: roomText,
		members: []
	});
};

function connectToRoom(newClient, roomID, name) {
	var flag = false;
	for (var i = 0; i < rooms.length; i++) {
		if (rooms[i].roomID == roomID) {
			rooms[i].members.push({
				client: newClient,
				name: name
			});
			flag = true;
		}
	}
	return flag;
};

function getNamesOfClientsInRoom(roomID) {
	var names = [];
	for (var i = 0; i < rooms.length; i++) {
		if (rooms[i].roomID == roomID) {
			for (var j = 0; j < rooms[i].members.length; j++) {
				names.push(rooms[i].members[j].name);
			}
		}
	}
	return names;
};

function getRoomText(roomID) {
	for (var i = 0; i < rooms.length; i++) {
		if (rooms[i].roomID == roomID) {
			return rooms[i].roomText;
		}
	}
};

function broadcastToAllClientsInRoom(roomID, data) {
	for (var i = 0; i < rooms.length; i++) {
		if (rooms[i].roomID == roomID) {
			for (var j = 0; j < rooms[i].members.length; j++) {
				if (rooms[i].members[j].client.readyState === WebSocket.OPEN) {
					rooms[i].members[j].client.send(data);
				}
			}
		}
	}
};

function broadcastToRoomOwner(roomID, data) {
	for (var i = 0; i < rooms.length; i++) {
		if (rooms[i].roomID == roomID) {
			if (rooms[i].owner.readyState === WebSocket.OPEN) {
				rooms[i].owner.send(data);
			}
		}
	}
};

function broadcastToClientInRoom(roomID, name, data) {
	for (var i = 0; i < rooms.length; i++) {
		if (rooms[i].roomID == roomID) {
			for (var j = 0; j < rooms[i].members.length; j++) {
				if (rooms[i].members[j].name == name) {
					if (rooms[i].members[j].client.readyState === WebSocket.OPEN) {
						rooms[i].members[j].client.send(data);
					}
				}
			}
		}
	}
}

wss.on('connection', function connection(newClient) {
	// console.log("A new client just connected!");
	newClient.on('message', function incoming(data) {
		// console.log("A client just sent a message to the server: ", data);
		var parsed = JSON.parse(data);


		if (parsed.messageType == "CreateNewRoom") { // needs roomID, and room text
			createNewRoom(newClient, parsed.roomID, parsed.roomText);
		} 

		else if (parsed.messageType == "ConnectToRoom") { // needs roomID and name
			var names = getNamesOfClientsInRoom(parsed.roomID);
			var flag = true;
			for (var i = 0; i < names.length; i++) {
				if (parsed.name == names[i]) {
					flag = false;
				}
			}

			if (flag) {
				// name is allowed.
				var success = connectToRoom(newClient, parsed.roomID, parsed.name);
				if (!success) {
					// Room doesn't exist.
					newClient.send(JSON.stringify({
						"messageType": "ErrorMessage",
						"error": "Room does not exist."
					}));
				} else {
					// Room exists.
					newClient.send(JSON.stringify({
						"messageType": "Reply",
						"message": "ConnectedToRoom",
						"roomText": getRoomText(parsed.roomID)
					}));

					broadcastToRoomOwner(parsed.roomID, JSON.stringify({
						"messageType": "Notification",
						"message": "UserJoinedRoom",
						"name": parsed.name
					}));
				}
			} else {
				// Name is already taken.
				newClient.send(JSON.stringify({
					"messageType": "ErrorMessage",
					"error": "Name is already taken in desired room"
				}));
			}

			
		} 

		else if (parsed.messageType == "BroadcastToRoom") { // needs roomID and data to broadcast.
			broadcastToAllClientsInRoom(parsed.roomID, parsed.data);
		}

		else if (parsed.messageType == "SelectStudent") { // needs roomID and name.
			broadcastToClientInRoom(parsed.roomID, parsed.name, JSON.stringify({
				"messageType": "Notification",
				"message": "Selected"
			}));
		}

		else if (parsed.messageType == "DeselectStudent") { // needs roomID and name.
			broadcastToClientInRoom(parsed.roomID, parsed.name, JSON.stringify({
				"messageType": "Notification",
				"message": "Deselected"
			}));
		}

	});
});