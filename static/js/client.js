// Клиент
var client = {
    'statistic': {
        'inbound': 0,
        'outbound': 0,
        'incoming_events': 0,
        'outcount': 0,
    },
    'room_name': null,
    'socket': null,
    'logged_id': null,
    'last_login': null,
    'last_skin_index': null,
    'prev_event': {},
    'strings': [],
    'incomming_command_stats': {},
    start: function(connection_properties) {
      	for(cmd in game.options.event) {
            var id = game.options.event[cmd]
            this.incomming_command_stats[id] = {
                'name': cmd,
                'count': 0,
                'size': 0
            };
      	}
      	if(game.objects.game_interface_group != null) {
            game.objects.game_interface_group.alpha = 0;
            game.target_hud_alpha = 0;
  		}
        this.strings[game.options.event.connected] = '%time%: <sys>Вы успешно вошли в игру под именем %login%</sys>';
        this.strings[game.options.event.user_joined] = '%time%: <sys>Игрок %login% присоединился к игре.</sys>';
        this.strings[game.options.event.user_exit] = '%time%: <err>Игрок %login% покинул игру.</err>';
        this.last_login = connection_properties.Login;
        this.last_skin_index = connection_properties.SkinIndex;;
        // Создаем соединение с сервером
        try {
            if(this.socket == null) {
                if (window["WebSocket"]) {
                    let server_url = location.hostname;
                    if(location.port) {
                        server_url += ':' + location.port;
                    }
                    let protocol = window.location.protocol == 'https:' ? 'wss:' : 'ws:';
                    let ws_url = protocol + '//' + server_url + '/ws';
                    console.log('ws_url', ws_url);
                    var socket = new WebSocket(ws_url
                        + '?Login=' + connection_properties.Login
                        + '&ServerName=' + connection_properties.ServerName
                        + '&StartSnakeSize=' + connection_properties.StartSnakeSize
                        + '&ArenaRadius=' + connection_properties.ArenaRadius
                        + '&AddApplesOnCollisionWall=' + (connection_properties.AddApplesOnCollisionWall ? 1 : 0)
                        + '&KillOnCollisionSnakes=' + (connection_properties.KillOnCollisionSnakes ? 1 : 0)
                        + '&AppleIntensive=' + connection_properties.AppleIntensive
                        + '&ConnectTypeName=' + connection_properties.ConnectTypeName
                    );
                    this.socket = {
                        'socket': socket,
                        'json': {
                            'socket': socket,
                            'send': function(data) {
                                this.socket.send(JSON.stringify(data));
                            }
                        }
                    }
                    socket.onopen = function() {
                        console.log("Connected!");
                        // Обработка пакета с сервера
                        this.onmessage = function(evt) {
                            client.statistic.inbound += evt.data.length;
                            client.statistic.incoming_events++;
                            var messages = JSON.parse(evt.data);
                            for(var i = 0; i < messages.length; i++) {
                                var msg = messages[i];
                                var e = msg.event;
                                var d = msg.data;
            		            client.onevent(e, d);
                            }
        		        };
                        client.send(game.options.event.login, {
                            'login': client.last_login,
                            'skin_index': client.last_skin_index
                        });
              		};
          			socket.onclose = function(evt) {
      					console.log("Connection closed");
                        game.pause = true;
    		            location.reload();
          			};
          			socket.onerror = function(evt) {
      					alert('Error');
          			};
                } else {
                    alert("Sorry, your device does not supported");
                }
		        }
        } catch(e) {
            // alert(e);
            $('#form-login .error').html('Нет связи с сервером<br>' + e);
        }
    },
    // Отправка команды на сервер
    send: function(event, data){
        var packet = {
            'Name': event,
            'Params': data
        };
        this.statistic.outbound += JSON.stringify(packet).length;
        this.socket.json.send(packet);
        /*
        var packet = [event, data];
        this.statistic.outbound += JSON.stringify(packet).length;
        this.socket.json.send(packet);
        */
    },
    // входящие сигналы с сервера
    onevent: function(event, data) {

        //try {

	        /*if(client.logged_id) {
        		var str = JSON.stringify([event, data]);
        		if(str.length > 200) {
					str = str.substring(1, 200);
        		}
        		game.addLog(1, str);
			}*/

            if(event == game.options.event.ping) {
            	return client.send(game.options.event.pong, []);

			} else if(event == game.options.event.connected) {
                $('canvas').css({visibility: 'visible'});
                if(game.objects.apples.apple_group == null) {
                	game.arena_radius = data.arena_radius;
	                game.initObjects(0, null, []);
	                game.initControl();
	                game.resize();
				}
                client.room_name = data.room_name;
                client.logged_id = data.id;
                var snake = game.addSnake(data.size, data.x, data.y, data.login, data.id, data.skin_index);
                game.autopilot.on = data.autopilot;
                // добавляем в лог сообщение
                game.addLog(1, this.strings[event]
                    .replace(/\%time\%/, data.time)
                    .replace(/\%login\%/, data.login));
                // game.commands.refreshUserList(data.user_list);
                // game.commands.refreshAppleList(data.apple_list);
                game.objects.game_interface_group.alpha = 0;
                game.target_hud_alpha = 1;
            // сообщение
            } else if(event == game.options.event.msg) {
                game.addLog(1, data.msg);
			}

            if(client.logged_id == null || game.isGameOver()) {
                return;
            }

            if(event == game.options.event.user_joined || event == game.options.event.user_show) {
            	// size, x, y, nickname, id, skin_index, balls
                game.addSnake(data.size, data.x, data.y, data.login, data.id, data.skin_index, data.balls);
                if(event == game.options.event.user_joined) {
	                // добавляем в лог сообщение
	                game.addLog(1, this.strings[event]
	                    .replace(/\%time\%/, data.time)
	                    .replace(/\%login\%/, data.login));
				}

            } else if(event == game.options.event.user_exit || event == game.options.event.user_hide) {
                // добавляем в лог сообщение
                if(data.id == client.logged_id) {
                    game.gameover();
                } else if(event == game.options.event.user_exit) {
	                game.addLog(1, this.strings[event]
	                    .replace(/\%time\%/, data.time)
	                    .replace(/\%login\%/, data.login));
				}
                game.commands.removeSnake(data.id);

            // получен новый список пользователей
            } else if(event == game.options.event.user_list) {
                game.commands.refreshUserList(data.list);

            } else if(event == game.options.event.pos) {
                game.commands.setPosition(data);

            } else if(event == game.options.event.apple) {
                game.objects.apples.add(data[0], data[1], data[2]);

            } else if(event == game.options.event.upd_points) {
            	game.commands.updateSize(data);

            } else if(event == game.options.event.radar) {
                game.objects.radar.setData(data);

            // съел яблоко
            } else if(event == game.options.event.eat) {
            	game.commands.eat(data);
            }
        //} catch(e) {
        ////	console.log([event, data]);
        //    alert('Error in event `' + event + '`:\n' + e);
        //}
    }
};


/*
function dump(arr, level) {
    var dumped_text = '';
    if(!level) level = 0;
    var level_padding = '';
    for(var j = 0; j < level + 1; j++) {
        level_padding += '    ';
    }
    if(typeof(arr) == 'object') { // Array/Hashes/Objects
        for(var item in arr) {
            var value = arr[item];
            if(typeof(value) == 'object') { //If it is an array,
                dumped_text += level_padding + "'" + item + "' ...\n";
                dumped_text += CustomUI.dump(value, level + 1);
            } else {
                dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
            }
        }
    } else {
        dumped_text = '>' + arr + '<(' + typeof(arr) + ')';
    }
    alert(dumped_text);
}*/
