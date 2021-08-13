<?/*<table>
    <?for($i = 0; $i < 15000; $i++) {?>
        <?$sz = ceil(sqrt($i) * 15);?>
        <tr>
            <td><?=$i?></td>
            <td><?=$sz?></td>
        </tr>
    <?}?>
</table><?
exit;*/


    $version = trim(file_get_contents(__DIR__.'/version.tmp')).'e';
    define('SERVERNAME', $_SERVER['SERVER_NAME']);
    define('IS_DEVELOPER_HOST', strpos(SERVERNAME, '.loc') !== false);
    define('GAME_PORT', 5555);
    define('GAME_SERVER', IS_DEVELOPER_HOST ? 'localhost' : '91.144.141.110');
?><!-- saved from url=(0014)about:internet -->
<!doctype html>
<html lang="ru-RU">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Cache-Control" content="no-cache"/>
    <title>Змейка</title>
    <meta name="viewport" content="width=device-width, initial-scale=0.5">
    <!-- <meta name="viewport"content="width=device-width, height=device-height, initial-scale=1.0, user-scalable=no, maximum-scale=1.0"/> -->
    <meta content="/img/logo_original.png" itemprop="image">
    <link rel="icon" type="image/png" href="/img/logo_original.png" mce_href="/img/logo_original.png">
    <link href="/img/logo_original.png" rel="shortcut icon">
    <!-- Blackberry and etc. -->
    <meta http-equiv="cleartype" content="on"/>
    <meta name="HandheldFriendly" content="True"/>
    <!-- IE -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
    <!--[if IE]>
    <meta http-equiv="imagetoolbar" content="no"/>
    <meta http-equiv="MSThemeCompatible" content="no"/>
    <![endif]-->
    <!-- iPhone -->
    <meta name="apple-mobile-web-app-capable" content="yes"/>
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
    <!-- <link rel="apple-touch-startup-image" href="img/icons/iPhone/startup.png"/> -->
    <link rel="apple-touch-icon" href="/img/icons/iPhone/touch-icon-iphone.png"/>
    <link rel="apple-touch-icon" sizes="76x76" href="/img/icons/iPhone/touch-icon-ipad.png"/>
    <link rel="apple-touch-icon" sizes="114x114" href="/img/icons/iPhone/touch-icon-iphone-retina.png"/>
    <link rel="apple-touch-icon" sizes="144x144" href="/img/icons/iPhone/touch-icon-ipad-retina.png"/>
    <!-- Windows 8 -->
    <meta name="application-name" content="Snake Game"/>
    <meta name="msapplication-tooltip" content="Slitherio like game"/>
    <meta name="msapplication-window" content="width=400;height=300"/>
    <meta name="msapplication-TileColor" content="#ffffff"/>
    <meta name="msapplication-TileImage" content="/img/icons/Win8/custom_icon_144.png"/>
    <meta name="msapplication-square70x70logo" content="/img/icons/Win8/custom_icon_70.png"/>
    <meta name="msapplication-square150x150logo" content="/img/icons/Win8/custom_icon_150.png"/>
    <meta name="msapplication-square310x310logo" content="/img/icons/Win8/custom_icon_310.png"/>
    <meta name="msapplication-wide310x150logo" content="/img/icons/Win8/custom_icon_310x150.png"/>
    <!-- Android and etc. -->
    <meta name="format-detection" content="telephone=no"/>
    <meta name="format-detection" content="address=no"/>
    <link rel="stylesheet" href="/css/style.css?v=<?=$version?>">
    <script>
        var game_port = '<?=GAME_PORT?>';
        var game_server = '<?=GAME_SERVER?>:<?=GAME_PORT?>';
    </script>
    <script src="/js/jquery-2.1.4.min.js"></script>
    <script src="/js/functions.js?v=<?=$version?>"></script>
    <script src="/js/pixi.min.js?v=<?=$version?>"></script>
    <script src="/js/light.js?v=<?=$version?>"></script>
    <script src="/js/pixi-multistyle-text.js?v=<?=$version?>"></script>
    <script src="/js/game.js?v=<?=$version?>"></script>
    <script src="/js/engine.js?v=<?=$version?>"></script>
    <script src="http://<?=GAME_SERVER?>:<?=GAME_PORT?>/socket.io/socket.io.js"></script>
    <!-- <script src="/js/socket.io-1.3.7.js"></script> -->
    <script src="/js/client.js?v=<?=$version?>"></script>
    <script src="/sound/howler.js-master/howler.min.js"></script>
</head>
<body oncontextmenu="return false;">

    <div id="game_canvas"></div>

	<!-- <div id="wood_frame"> -->
		<form id="form-login">
			<script>
				var sockets = [];
				var gid = 0;

				function getNextId() {
					return ++gid;
				}

				function test() {

                    console.log('---------');

                    var socket = io.connect('http://127.0.0.1:1025');
                    socket.on('error', function (e) {
                        alert('Error at #' + i + ' socket');
                    });
                    socket.on('disconnect', function (e) {
                        console.log('disconnect socket');
                    });
                    socket.on('connect', function(socket) {
                        console.log('connect');
                        client.socket.on('message', function(msg) {
                            console.log('message');
                        });
                        /*
                        var id = getNextId();
                        var login = 'Autopilot №' + id;
                        var skin_index = id % game.options.snake_textures.length;
                        this.login = login;
                        this.json.send([game.options.event.login, {'login': login, 'skin_index': skin_index}]);*/
                    });

                    console.log('+++++++++++++')
                    return;

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

			</script>
			<div>
				<div class="logo">
					<img src="/img/logo_web.png" alt="Snake" style="height: 109px;">
				</div>
				<input type="hidden" id="input_skin_index">
		        <h1>Введите имя</h1>
		        <br><input id="input_login" type="text" value="user" style="width: 100%;" autofocus required autocapitalize="off" autocorrect="off" spellcheck="false">
		        <div id="skin_list"></div>
		        <div style="width: 200px; text-align: center; margin: auto auto;">
        			<a class="btn btn-primary btn-block disabled" id="btn-start" style="cursor: pointer; font-size: 25px; padding: 20px; text-decoration: none" href="#">Начать</a>
		        </div>
		        <div class="error" style="margin-top: 15px; color: rgba(255,255,0,.7); height: 40px;"></div>
	        </div>
	    </form>
    <!-- <div> -->

	<script>

        function start() {
        	$('#btn-start').addClass('disabled');
            var login = $('#input_login').val();
            var skin_index = $('#input_skin_index').val(); // (login.toLowerCase().charCodeAt(0) + 6) % game.textures.snake.length;
            // сохранение введенного логина, чтобы в будущем пользователь не вводил его заново
            localStorage.setItem('login', login);
            localStorage.setItem('skin_index', skin_index);
            client.start(login, skin_index);
            return false;
        }

        var ws = {
        	socket: null,
        	init: function() {
				this.socket = io.connect('http://127.0.0.1:8088', {'transports': ['websocket']});
				this.socket.on('error', function (e) {
					console.log('ws:error');
				});
				this.socket.on('disconnect', function () {
					console.log('ws:disconnect');
				}),
				this.socket.on('connect', function () {
					console.log('ws:connected');
					// Обработка пакета с сервера
					ws.socket.on('message', function(msg) {
						console.log('ws:message:');
						console.log(msg);
					});
					ws.socket.json.send(['login', {'login': 'user2', 'skin_index': 5}]);
				});
			}
		}

        $(function(){

        	$('#btn-start').removeClass('disabled').on('click', function(){
        		if($(this).hasClass('disabled')) {
					return false;
        		}
				return start();
        	});

            $('body').on('keydown', function(e){
                if(e.keyCode == 13) {
                	// Enter
                    if($('#form-login').is(':visible')) {
                        return start();
                    }
                } else if(e.keyCode == 72) {
                	// H
                	// ws.init();
                	// return;
                	console.log('p');
                	if(game.target_hud_alpha == 1) {
						game.target_hud_alpha = 0;
                	} else {
						game.target_hud_alpha = 1;
                	}
                    // game.objects.game_interface_group.visible = !game.objects.game_interface_group.visible;
                } else if(e.keyCode == 45) {
                	// insert
                    test();
                }
            });

            // Init engine
            engine.init('game_canvas', 1024, 768);
            game.initTextures();
            for(var i = 0; i < game.options.snake_textures.length; i++) {
            	var item = game.options.snake_textures[i];
            	$('#skin_list').append('<div class="skin"><div style="background: url(/img/snake/' + item.name + '.png) no-repeat left bottom; width: '+item.size+'px; /*-moz-transform: scale(' + (64 / item.size) + ');*/ -ms-zoom: ' + (64 / item.size) + '; -webkit-zoom: ' + (64 / item.size) + '; zoom: ' + (64 / item.size) + '; height: '+item.size+'px;"></div></div>');
            }

            // Select skin
        	$('.skin').on('click', function(e){
        		$('.skin').removeClass('active');
        		$(this).addClass('active');
				$('#input_skin_index').val($(this).index());
        	});

            // Вычитка сохраненных параметров входа
            var login = localStorage.getItem('login');
            if(!login) {
                login = 'user' + Math.round(Math.random() * 1024);
            }
            $('#input_login').val(login).focus().select();
            var skin_index = localStorage.getItem('skin_index');
            if(!skin_index) {
                skin_index = 11;
            }
            $('#input_skin_index').val(skin_index);
            $('.skin:eq('+skin_index+')').addClass('active');

            engine.draw();
        });

		try {
            // музыка, звуки
            // *** !!! http://soundimage.org/looping-music/ !!! ***
            var audio = {
                menu: new Howl({urls: ['/playlist/menu.mp3'], loop: true}),
                plop: new Howl({urls: ['/sound/plop.mp3'], volume: .05}),
                back: new Howl({urls: ['/sound/back.mp3'], volume: .5})
            };
		} catch(e) {
			alert(e);
		}

        // механизм смены направления движения
        setInterval(function(){
            game.changeAngle();
        }, 10);

        //setInterval(function(){
        //    game.moveSnakes(null);
        //}, 15);

        // обновление статистики
        setInterval(function(){
            // top10 user list
            game.draw.leaderBoard();
            game.updateStat();
		}, 250);

        // обновление статистики
        setInterval(function(){
        	var cnt = 0;
        	var sz = 0;
            for(id in client.incomming_command_stats) {
				var stat = client.incomming_command_stats[id];
				cnt += stat.count;
				sz += stat.size;
				console.log(stat.name + ' ' + ('.'.repeat(20 - stat.name.length)) +
				('.'.repeat(9 - new String(stat.count).length)) + ' ' + stat.count + ' | ' +
				(' '.repeat(9 - new String(stat.size).length)) + stat.size + ' bytes');
            }
            if(cnt > 0) {
	            console.log('————————————————————————————————————————————————————————————');
	            console.log('count: ' + cnt + ' | size: ' + sz);
	            console.log('————————————————————————————————————————————————————————————');
			}
		}, 1000);

        // отрисовка очередного кадра
		engine.animate = function(frames, time, fps) {
            var pn = engine.performance_now / 1000;
			if(time > 20) {time = 20;}
            if(game.pause) {return;}
			if(client.logged_id == null) {return;}
            game.objects.restart_button.tick(pn);
            // apples
            game.objects.apples.apple_visible_count = game.objects.apples.tick(pn, time, frames);
            // circular blades
            game.objects.circular_blade.tick(pn);
            // HUD
            game.objects.hud.tick(pn, time);
        }

	</script>

</body>
</html>
