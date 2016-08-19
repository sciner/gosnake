var sockets = [];
var gid = 0;
var need_count = 0;

function getNextId() {
	return ++gid;
}

function test() {
    var count = window.prompt('Введите количество ботов', 1);
    if(count == null) {
        return;
    }
	need_count += count
	createSockets();
	return false;
}

function createSockets() {
	if(sockets.length >= need_count) {
		return;
	}
	var id = getNextId();
	var login = 'Autopilot №' + id;
	var socket = new WebSocket("ws://" + game_server + "/ws?Login=" + login );
	sockets.push(socket);
	socket.login = login;
	socket.skin_index = id % game.options.snake_textures.length;
	socket.onopen =  function(socket) {
		var event = game.options.event.login;
		var data = {
			'login': this.login,
			'skin_index': this.skin_index
		};
		var packet = {
			'Name': event,
			'Params': data
		};
		this.send(JSON.stringify(packet));
		createSockets()
	};
}

/*
NodeJS
function test() {
    var count = window.prompt('Введите количество ботов', 1);
    if(count == null) {
        return;
    }
	for(var i = 0; i < count; i++) {
		try {
			sockets.push(io.connect('http://' + game_server));
			var socket = sockets[sockets.length - 1];
	        socket.on('error', function (e) {
	            alert('Error at #' + i + ' socket');
	        });
	        socket.on('disconnect', function (e) {
	            console.log('disconnect socket #' + this.login);
	        });
	        socket.on('connect', function(socket) {
	            var id = getNextId();
        		var login = 'Autopilot №' + id;
        		var skin_index = id % game.options.snake_textures.length;
                        this.login = login;
	            this.json.send([game.options.event.login, {'login': login, 'skin_index': skin_index}]);
	        });
		} catch(e) {
			alert(e);
		}
	}
	return false;
}
*/

/*
	if (window["WebSocket"]) {
			conn = new WebSocket("ws://{{.Host}}/ws?name=" + name);
			conn.onopen = function() {
					console.log("Connected");
					var id = getNextId();
					// var login = 'Autopilot №' + id;
					var skin_index = 4; // id % game.options.snake_textures.length;
					// login = login;
					// this.send(JSON.stringify([1, [login, skin_index]));
					this.send(JSON.stringify({
							"Name": 1,
							"Params": {
								login: login,
								skin_index: skin_index
							}
						}));
					// this.send(JSON.stringify([1, [login, new String(skin_index), command.val()]]));
			};
			conn.onclose = function(evt) {
					console.log("Connection closed");
			};
			conn.onmessage = function(evt) {
					log.val(log.val() + '\n' + evt.data);
			}
	} else {
			window.alert("Sorry, your device does not supported");
	}
*/
