// window.getSelection().getRangeAt(0)

// n is the length of the random id.
function GenerateRoomID(n) {
	var s = "";
	for (var i = 0; i < n; i++) {
		var rand = Math.random();
		s += Math.floor(Math.random() * 10);
	}
	return s;
}

var App = new Vue({
	el: '#app',
	data: {
		// entering room, creating room, in room, teaching room.
		mode: 0,
		reader: false,

		socket: null,

		enterRoomID: null,
		nameInput: "",

		currentRoomID: null,
		bookInput: "",
		roomText: "",

		students: [],
		selectedStudent: null
	},
	methods: {
		AttemptToEnterRoom: function () {
			this.SendMessage({
				"messageType": "ConnectToRoom",
				"roomID": this.enterRoomID,
				"name": this.nameInput
			});
		},

		StartCreatingNewRoom: function () {
			this.mode = 1;
		},

		CreateNewRoom: function () {
			this.mode = 3;
			this.currentRoomID = GenerateRoomID(6);
			// console.log(this.currentRoomID);
			// Send info about the new room to the server.
			this.SendMessage({
				"messageType": "CreateNewRoom",
				"roomID": this.currentRoomID,
				"roomText": this.bookInput
			});

			window.addEventListener('mouseup', e => {
				var range = window.getSelection().getRangeAt(0);
				var start = range.startOffset;
				var end   = range.endOffset;

				this.SendMessage({
					"messageType": "BroadcastToRoom",
					"roomID": this.currentRoomID,
					"data": JSON.stringify({
							"messageType": "Notification",
							"message": "TextHighlighted",
							"start": start,
							"end": end
						})
				});
			});
		},

		SelectStudent: function (student) {
			var lastStudent = null;
			if (this.selectedStudent == null) { // select a student to read.
				this.selectedStudent = student;
				student.style = "selectedStudent";
			} else if (student != this.selectedStudent) { // Deselect last student and select new one.
				lastStudent = this.selectedStudent;
				this.selectedStudent.style = "student";
				this.selectedStudent = student;
				student.style = "selectedStudent";
			} else { // Deselect a student to read.
				lastStudent = this.selectedStudent;
				this.selectedStudent = null;
				student.style = "student";
			}

			if (this.selectedStudent != null) {
				this.SendMessage({
					"messageType": "SelectStudent",
					"roomID": this.currentRoomID,
					"name": this.selectedStudent.name
				});
			}

			if (lastStudent != null) {
				this.SendMessage({
					"messageType": "DeselectStudent",
					"roomID": this.currentRoomID,
					"name": lastStudent.name
				})
			}
		},

		ConnectSocket: function() {
			this.socket = new WebSocket("wss://fast-dusk-80508.herokuapp.com/");
			this.socket.onmessage = (event) => {
				this.RecieveMessage(event);
			};
		},

		SendMessage: function (data) {
			this.socket.send(JSON.stringify(data));
		},

		RecieveMessage: function (event) {
			console.log(event.data);
			var data = JSON.parse(event.data);
			if (data.messageType == "ErrorMessage") {
				alert(data.error);
			} else if (data.messageType == "Reply") {
				if (data.message == "ConnectedToRoom") {
					this.mode = 2;
					this.roomText = data.roomText;
				}
			} else if (data.messageType == "Notification") {
				if (data.message == "UserJoinedRoom") {
					this.students.push({name: data.name, style: "student"});
				} else if (data.message == "Selected") {
					this.reader = true;
				} else if (data.message == "Deselected") {
					this.reader = false;
				} else if (data.message == "TextHighlighted") {
					if (data.start != data.end) {
						// console.log("start: ", data.start, "end: ", data.end);
						data.end += 1;
						var string = document.getElementById("studentsText").innerHTML;
						string = string.split('');
						string.splice(data.start, 0, "<mark id=\"selectedText\">");
						string.splice(data.end, 0, "</mark>");
						string = string.join('');
						document.getElementById("studentsText").innerHTML = string;
					} else {
						document.getElementById("studentsText").innerHTML = this.roomText;
					}
				}
			}
		}

	},
	created: function () {
		// Called when the Vue app is loaded and ready.
		this.ConnectSocket();
	}
});