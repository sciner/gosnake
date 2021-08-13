var class_bezier = {

	calc_count: 0,

	calc: function(snake) {
		for(var i = 0; i < snake.ball_group.children.length - 1; i++) {
			var ball = snake.ball_group.getChildAt(i);
			ball.visible = false;
		}
		var d = snake.balls.length - (snake.ball_group.children.length - 1);
        if(d > 0) {
			for(var i = 0; i < d; i++) {
				var skin_index = snake.skin_index;
				var snake_texture = game.textures.snake[skin_index].textures;
				var texture_index = snake.ball_group.children.length % (snake_texture.length - 1) + 1;
				var ball = new PIXI.Sprite(snake_texture[texture_index]);
				ball.anchor.y = ball.anchor.x = .5;
				ball.scale.x = ball.scale.y = snake.scale;
				ball.visible = false;
				ball.z = snake.ball_group.children.length;
				snake.ball_group.addChildAt(ball, 0);
			}
		}
        for(var i = 0; i < snake.balls.length; i++) {
            var a = snake.balls[i];
			var b = snake.ball_group.getChildAt(snake.ball_group.children.length - i - 1);
            b.x = a.x;
            b.y = a.y;
            // b.rotation = a.rotation;
            b.visible = true;
        }
	}

};

// Текущее состояние игры
var game = {
	options: require('/static/js/options.js?v=' + game_version),
	arena_radius: 0,
    x: 0,
    y: 0,
    mouse_x: 0,
    mouse_y: 0,
    frames: 0,
    my_place: 1,
    apple_visible_count: 0,
    move_snakes_timer: 0,
    prev_eat_time: 0,
    target_hud_alpha: 0,
    prev_pos: {
		'angleRadians': 0,
		'speed': 0,
		'x': 0,
		'y': 0
    },
    autopilot: {
		'on': false
    },
    text_left: null,
    line: null,
    leaderboard: null,
    logboard: null,
    pause: false,
    playMusic: true,
    tilingSprite: null, // background
    // фильтры
    filters: {},
    log_records: [],
    snakes: [],
    screen_scale_current: .5,
    arena_objects: null, // Группа всяких объектов на карте
    textures: {
        sprites: null,
        circular_blade: null,
        ball: [],
        snake: [],
        boke: [],
        logo_small: null,
        restart_button: null
    },
    objects: {
        game_interface_group: null,
        snakes: null,
        apple_visible_count: 0,
        // Группа яблок
        apples: {
            apple_group: null,
            buffer: [],
            init: function(){
                this.apple_group = engine.addGroup([], engine.width / 2, engine.height / 2, false, null);
            },
            add: function(x, y, points) {
            	if(this.buffer.length) {
					var apple = this.buffer.pop();
            	} else {
	                var apple = new PIXI.Sprite(game.textures.boke[this.apple_group.children.length % game.textures.boke.length]);
	                apple.anchor.x = apple.anchor.y = .5;
	                apple.blendMode = PIXI.BLEND_MODES.ADD;
					// var lightSprite = new PIXI.Sprite(lightTexture);
					// lightSprite.blendMode = PIXI.BLEND_MODES.ADD;
					// lightSprite.anchor.x = lightSprite.anchor.y = 0.5;
					// lightSprite.scale.x = lightSprite.scale.y = .8;
					// lightSprite.alpha = .5;
					// apple.addChild(lightSprite);
				}
                apple.x = x;
                apple.y = y;
                apple.modifiers = {
                    'points': points,
                    'real_x': x,
                    'real_y': y,
                    'pos': [x, y],
                    'move': [0, 0],
                    'scale': [0,0],
                    'rotate': [0,0],
                    'lifes': 100,
                    'radar_sprite': null,
                    'alpha': 0,
                    'index': this.apple_group.children.length
                };
                this.apple_group.addChild(apple);
            },
            remove: function(k, remove_now) {
                var apple = this.apple_group.getChildAt(k);
                if(apple.modifiers.radar_sprite != null) {
                    game.objects.radar.remove(apple.modifiers.radar_sprite);
                }
                if(remove_now || apple.modifiers.lifes <= -1) {
                	var apple = this.apple_group.getChildAt(k);
                	this.buffer.push(apple);
                    this.apple_group.removeChildAt(k);
                } else {
                    apple.modifiers.lifes = 0;
                }
            },
            move: function(x, y) {
                this.apple_group.x = x;
                this.apple_group.y = y;
            },
            /**
            * @var pn: performance.now() / 1000;
            * @var time: milliseconds after previous frame rendrering
            * @var frames: total frames rendrering count
            */
            tick: function(pn, time, frames) {
                var apple_visible_count = 0; // количество модифицированных яблок, попавших в зону видимости (экрана)
                // перебор всех яблок
                for (var i = this.apple_group.children.length - 1; i >= 0; i--) {
                    var apple = this.apple_group.getChildAt(i);
                    var mod = apple.modifiers;
                    // если яблоко невидно на экране, тогда уничтожаем его
                    if(mod.lifes <= -1) {
                        this.remove(i);
                    }
                }
                for(var i in this.apple_group.children) {
                    if(!this.apple_group.children.hasOwnProperty(i)) {
                        continue;
                    }
                    var apple = this.apple_group.children[i];
                    var mod = apple.modifiers;
                    apple.visible = false;
                    var apple_border = 200;
                    // если яблоко невидно на экране, тогда никак не обрабатываем его
                    if(mod.lifes <= -1) { continue; }
                    if(this.apple_group.position.x + mod.pos[0] > engine.width + apple_border) { continue; }
                    if(this.apple_group.position.x + mod.pos[0] < -apple_border) { continue; }
                    if(this.apple_group.position.y + mod.pos[1] > engine.height + apple_border) { continue; }
                    if(this.apple_group.position.y + mod.pos[1] < -apple_border) { continue; }
                    apple.visible = true;
                    apple_visible_count++;
                    // небольшая смена позиции яблока (вращение вокруг центра)
                    mod.move[0] += .01 * (time / 3);
                    mod.move[1] += .01 * (time / 3);
                    if(mod.index % 2 == 0) {
                        var x = mod.pos[0] + Math.cos(mod.index + mod.move[0]) * 5;
                        var y = mod.pos[1] + Math.sin(mod.index + mod.move[1]) * 5;
                    } else {
                        var x = mod.pos[0] + Math.sin(mod.index + mod.move[0]) * 5;
                        var y = mod.pos[1] + Math.cos(mod.index + mod.move[1]) * 5;
                    }
                    apple.position.x = x;
                    apple.position.y = y;
                    if(mod.lifes <= 0) {
                        mod.lifes -= time / 240;
                        apple.alpha = 1 - -mod.lifes;
                        apple.scale.x = apple.scale.y = 1 + -mod.lifes * 5; // (player_snake.speed == 1 ? 5 : 70);
                    } else {
                        mod.alpha += time / 3000;
                        mod.alpha = Math.min(mod.alpha, 1);
                        apple.alpha = mod.alpha;
                    }
                    // изменение размера яблока
                    if(mod.lifes > 0) {
                        apple.scale.x = apple.scale.y = (1 + Math.cos((pn * 100 + mod.index) / 25) * .25) * .7;
                    }
                }
                return apple_visible_count;
            },
            removeAll: function(){
                while(this.apple_group.children[0]) {
                    this.apple_group.removeChild(this.apple_group.children[0]);
                }
            },
            getCount: function(){
                return this.apple_group.children.length;
            }
        },
        // кнопка перезагрузки
        restart_button: {
            container: null,
            textures: {
                button: null
            },
            init: function(){
                this.container = engine.createObject(new PIXI.Sprite(game.textures.restart_button), engine.width / 2, engine.height / 2, false, false, .5, .5)
                    .on('click', function(e) {game.objects.restart_button.press();})
                    .on('tap', function(e) {game.objects.restart_button.press();z});
                this.container.interactive = this.container.buttonMode = true;
            },
            show: function(){
                this.container.alpha = 0;
                this.container.rotation = 0;
                delete this.container.restart_rotate_started;
                this.container.visible = true;
            },
            hide: function(){
                this.container.visible = false;
            },
            move: function(x, y){
                this.container.position.x = x;
                this.container.position.y = y;
            },
            press: function(){
            	//if(game.isGameOver()) {
				//
            	//}
			    for(var si in game.snakes) {
			        if (game.snakes.hasOwnProperty(si)) {
				        var snake = game.snakes[si];
				        snake.lifes = 0;
				        snake.eyes.visible = snake.text.visible = false;
				        snake.eyes.destroy();
				        snake.text.destroy();
						for(var i = snake.ball_group.children.length - 1; i >= 0; i--) {
							snake.ball_group.removeChild(snake.ball_group.children[i]);
						}
		                game.objects.snakes.removeChild(snake.ball_group);
						delete game.snakes[si];
	        		}
			    }
                game.objects.apples.removeAll();
                game.objects.radar.removeAll();
                this.container.visible = false;
                audio.menu.stop();
				client.send(game.options.event.login, {
					'login': client.last_login,
					'skin_index': client.last_skin_index
				});
            },
            tick: function(pn) {
                if(this.container.visible) {
                    if('restart_rotate_started' in this.container) {
                        if(this.container.alpha < 1) {
                            this.container.alpha = Math.min(pn - this.container.restart_rotate_started, 1);
                            this.container.scale.y = this.container.scale.x = this.container.alpha = Math.min(this.container.alpha, 1);
                        }
                    } else {
                        this.container.restart_rotate_started = pn;
                    }
                    this.container.rotation = pn * (2.1) / 8;
                }
            }
        },
        radar: {
            container: null,
            background: null,
            sprites: null,
            snake_positions: [],
            my_sprite: null,
            textures: {
                background: null,
                apple: null,
                snake_my: null,
                snake_enemy: null,
            },
            init: function(){
                this.container = new PIXI.Container();
                this.container.alpha = .5;
                this.textures.background = new PIXI.Texture(game.textures.sprites.baseTexture, new PIXI.Rectangle(0, 132, 200, 200));
                this.textures.apple = new PIXI.Texture(game.textures.sprites.baseTexture, new PIXI.Rectangle(65, 49, 3, 3));
                this.textures.snake_my = new PIXI.Texture(game.textures.sprites.baseTexture, new PIXI.Rectangle(68, 49, 5, 5));
                this.textures.snake_enemy = new PIXI.Texture(game.textures.sprites.baseTexture, new PIXI.Rectangle(73, 49, 5, 5));
                this.sprites = new PIXI.ParticleContainer(200000, [false, true, false, false, false]);
                this.background = new PIXI.Sprite(this.textures.background);
                this.background.x = -100;
                this.background.y = -100;
                this.container.addChild(this.background);
                this.container.addChild(this.sprites);
                game.objects.game_interface_group.addChild(this.container);
				this.my_sprite = new PIXI.Sprite(this.textures['snake_my']);
				this.container.addChild(this.my_sprite);
            },
            add: function(x, y, texture){
                var sprite = new PIXI.Sprite(this.textures[texture]);
                sprite.x = x;
                sprite.y = y;
                if(texture == 'apple') {
                	sprite.alpha = .5;
				}
                // console.log(x + 'x' + y);
                this.sprites.addChild(sprite);
                return sprite;
            },
            remove: function(sprite) {
                this.sprites.removeChild(sprite);
            },
            removeAll: function(){
                while(this.sprites.children[0]) {
                    this.sprites.removeChild(this.sprites.children[0]);
                }
            },
            setData: function(data) {
            	var points = data.points;
            	game.leaderboard.text = data.top10;
            	// game.my_place = data.my_place;
            	game.my_place = '0/' + data.count_total;
            	if(points.length > this.snake_positions.length) {
            		var texture = 'snake_enemy';
            		var need_count = points.length - this.snake_positions.length;
            		for(var i = 0; i <= need_count; i++) {
						var sprite = new PIXI.Sprite(this.textures[texture]);
						this.snake_positions.push(sprite);
						this.container.addChild(sprite);
					}
            	}
            	for(var i = 0; i < this.snake_positions.length; i++) {
            		this.snake_positions[i].visible = false;
				}
            	for(var i = 0; i < points.length; i++) {
            		var pos = points[i];
            		if(pos[0] == client.logged_id) {
						this.my_sprite.x = pos[1];
						this.my_sprite.y = pos[2];
            		} else {
            			var sprite = this.snake_positions[i];
            			sprite.visible = true;
            			sprite.x = pos[1];
            			sprite.y = pos[2];
					}
				}
            }
        },
        hud: {
            tick: function(pn, time){
                var speed = 0.002;
                var v = -1;
                if(game.target_hud_alpha > game.objects.game_interface_group.alpha) {
                    v = Math.min(1, game.objects.game_interface_group.alpha + speed * time)
                } else if(game.target_hud_alpha < game.objects.game_interface_group.alpha) {
                    v = Math.max(0, game.objects.game_interface_group.alpha - speed * time);
                }
                if(v > -1) {
                    game.objects.game_interface_group.alpha = v;
                    game.objects.game_interface_group.scale.x = v;
                    game.objects.game_interface_group.scale.y = v;
                    game.objects.game_interface_group.x = engine.width / 2 - (engine.width / 2) * v;
                    game.objects.game_interface_group.y = engine.height / 2 - (engine.height / 2) * v;
                }
            }
        },
        // циркулярные пилы по краям арены
        circular_blade: {
        	list: [],
        	iterate: 0,
			add: function(x, y) {
				var entity = engine.createObject(new PIXI.Sprite(game.textures.circular_blade), x, y, false, false, .5, .5);
				this.list.push(entity);
				game.arena_objects.addChild(entity);
			},
			tick: function(time) {
				// this.iterate++;
				for(var i = 0; i < this.list.length; i++) {
					var angle = time * 3 + i;
					this.list[i].rotation = angle;
				}
			}
        }
    },
    initTextures: function() {
        // загрузка спрайта
		this.textures.sprites = new PIXI.Texture.fromImage('/static/img/sprites.png?v=' + game_version);
		this.textures.circular_blade = new PIXI.Texture.fromImage('/static/img/circular_blade.png?v=' + game_version);
        // скины змеек
        $.each(game.options.snake_textures, function(k, v){
        	var size = v.size;
        	var path = '/static/img/snake/' + v.name + '.png';
            var temp_texture =  PIXI.Texture.fromImage(path);
            var textures = [
            	new PIXI.Texture(temp_texture, new PIXI.Rectangle(0, size, size, size)) // eyes
            ];
            for(var i = 0; i < v.length; i++) {
				textures.push(new PIXI.Texture(temp_texture, new PIXI.Rectangle(i * size, 0, size, size)));
            }
            game.textures.snake.push({
	            'path': path,
	            'name': v.name,
	            'textures': textures
            });
        });
        // текустуры яблок
		this.textures.boke.push(new PIXI.Texture(this.textures.sprites.baseTexture, new PIXI.Rectangle(48 * 1, 0, 48, 48)));
		this.textures.boke.push(new PIXI.Texture(this.textures.sprites.baseTexture, new PIXI.Rectangle(48 * 1, 0, 48, 48)));
		this.textures.boke.push(new PIXI.Texture(this.textures.sprites.baseTexture, new PIXI.Rectangle(48 * 2, 0, 48, 48)));
		this.textures.boke.push(new PIXI.Texture(this.textures.sprites.baseTexture, new PIXI.Rectangle(48 * 3, 0, 48, 48)));
        this.textures.boke.push(new PIXI.Texture(this.textures.sprites.baseTexture, new PIXI.Rectangle(48 * 4, 0, 48, 48)));
		this.textures.boke.push(new PIXI.Texture(this.textures.sprites.baseTexture, new PIXI.Rectangle(0, 335, 64, 64)));
        // логотип
        this.textures.logo_small = new PIXI.Texture(this.textures.sprites.baseTexture, new PIXI.Rectangle(0, 48, 64, 84));
        this.textures.restart_button = new PIXI.Texture(this.textures.sprites.baseTexture, new PIXI.Rectangle(203, 132, 250, 250));
	},
	log: function(text) {
		this.addLog(1, text);
	},
    getPlayer: function(){
    	if(client.logged_id == null) {
			return null;
    	}
    	var snake = this.getSnakeById(client.logged_id);
    	return snake;
    },
    switchAutopilot: function(){
    	game.autopilot.on = !game.autopilot.on;
		client.send(game.options.event.autopilot, {'value': game.autopilot.on});
    },
    isGameOver: function(){
		return this.objects.restart_button.container.visible;
    },
    gameover: function(){
        this.objects.restart_button.show();
        audio.menu.play();
        // audio.gameover.play();
        // audio.dead.play();
    },
    initObjects: function(apple_count, username, bot_nicknames) {

		// тень шариков
		var ball_shadow_filter = new PIXI.filters.DropShadowFilter();
		ball_shadow_filter.color = 0x0000;
		ball_shadow_filter.distance = 5;
		ball_shadow_filter.alpha = 0.5;
		ball_shadow_filter.angle = 45;
		ball_shadow_filter.blur = 5;

        this.filters = {
                ball_shadow_filter: ball_shadow_filter,
                BloomFilter: new PIXI.filters.BloomFilter(),
                SepiaFilter: new PIXI.filters.SepiaFilter(),
                // shockwave: new PIXI.filters.ShockwaveFilter(),
                // PixelateFilter: new PIXI.filters.PixelateFilter(),
                // DropShadowFilter: new PIXI.filters.DropShadowFilter(),
                // ascii: new PIXI.filters.AsciiFilter(),
                // noise: new PIXI.filters.NoiseFilter(),
                // tiltshift: new PIXI.filters.TiltShiftFilter(),
                // TwistFilter: new PIXI.filters.TwistFilter(),
                // BlurFilter: new PIXI.filters.BlurFilter(),
                // CrossHatchFilter: new PIXI.filters.CrossHatchFilter(),
                // DotScreenFilter: new PIXI.filters.DotScreenFilter()
        };
        // background
		this.tilingSprite = engine.addTile('/static/img/background.png?v=' + game_version);
        this.tilingSprite.tileScale.x = 1;
        this.tilingSprite.tileScale.y = 1;
		// var l = game.objects.game_interface_group.getChildAt(0);
		// var pondFloorTexture = PIXI.Texture.fromImage('/static/img/mud-nrm.png?v=' + game_version);
		// var filter = new PIXI.NormalMapFilter(pondFloorTexture);
		// this.tilingSprite.filters = [filter];

        // var renderTexture = new PIXI.RenderTexture(engine.renderer, engine.width, engine.height);
        // this.tilingSprite.filters = [new LightmapFilter(renderTexture)];

		// Группа яблок
        this.objects.apples.init();

		this.objects.snakes = engine.addGroup([], 0, 0, false, null);

		this.arena_objects = engine.addGroup([], engine.width / 2, engine.height / 2, true, null);

        var border_width = 150;
        var arena_radius = game.arena_radius + border_width / 2;

        // restart button | кнопка перезагрузки
        game.objects.restart_button.init();

        // Группа элементов интерфейса
        game.objects.game_interface_group = engine.addGroup([
            // Логотип
            engine.createObject(new PIXI.Sprite(game.textures.logo_small), 50, 60, false, false, .5, .5),
            game.objects.restart_button.container
            // engine.createObject(PIXI.extras.MovieClip.fromImages(['/pixi/lock.png', '/pixi/lock2.png']), engine.width - 80 * 2 - 40, 80, true, false, .5, .5).on('click', function(e) {alert('Locked');}),
        ], 0, 0, true, engine.stage);
        game.objects.game_interface_group.alpha = 0;

        // Забор вокруг арены
        var graphics = new PIXI.Graphics();
        graphics.alpha = .4;
        graphics.lineStyle(border_width, 0xff0000);
        graphics.moveTo(-arena_radius, -arena_radius);
        graphics.lineTo(arena_radius, -arena_radius);
        graphics.lineTo(arena_radius, arena_radius);
        // graphics.lineTo(0, 0);
        graphics.lineTo(-arena_radius, arena_radius);
        graphics.lineTo(-arena_radius, -arena_radius);
        graphics.endFill();
        this.arena_objects.addChild(graphics);

        /*for(var i = 0; i < 40; i++) {
            for(var j = 0; j < 40; j++) {
                var graphics = new PIXI.Graphics();
                graphics.alpha = .4;
                graphics.lineStyle(1, 0x00ff00);
                // draw a triangle using lines
                graphics.moveTo(0,0);
                graphics.lineTo(this.options.cell_size, 0);
                graphics.lineTo(this.options.cell_size, this.options.cell_size);
                graphics.lineTo(0, this.options.cell_size);
                graphics.lineTo(0, 0);
                // end the fill
                graphics.endFill();
                graphics.x = i * this.options.cell_size - this.options.arena_radius;
                graphics.y = j * this.options.cell_size;
                // add it the stage so we see it on our screens..
                this.arena_objects.addChild(graphics);
            }
        }*/

        // Пустота вокруг арены
        // var empty_size = 2000;
        // var m = empty_size * 0.109;
        // var p = arena_radius + empty_size / 2 - m;
		// var graphics2 = new PIXI.Graphics();
		// graphics2.lineStyle(empty_size, 0x000000, 1);
		// graphics2.drawPolygon([-p,-p, p,-p, p,p, -p,p]); //a square // graphics2.drawPolygon([-p,-p, p,-p, p,p, -p,p, -p,-p]); //doesn't have a broken corner now
		// this.arena_objects.addChild(graphics2);

        game.objects.radar.init();
        // engine.stage.addChild(this.radar);
        this.line = new PIXI.Graphics();
        this.line.alpha = 1;
        this.line.lineStyle(9, 0xff0000);
        this.arena_objects.addChild(this.line);

        for(var i = -arena_radius; i < arena_radius; i += 150) {
        	game.objects.circular_blade.add(i, -arena_radius);
        	game.objects.circular_blade.add(i, arena_radius);
        	game.objects.circular_blade.add(-arena_radius, i);
        	game.objects.circular_blade.add(arena_radius, i);
		}

        // Генерация яблок
        var arad = this.arena_radius - 50;
		for(var i = 0; i < apple_count; i++) {
			var r = Math.random() * (Math.PI * 2);
			var x = Math.random() * arad * 2 - arad;
			var y = Math.random() * arad * 2 - arad;
			game.objects.apples.add(x, y, 1);
		}

        /*
        game.pause = ! game.pause;
        if(game.pause) {
            engine.container.filters = [game.filters.SepiaFilter];
        } else {
            engine.container.filters = null;
        }*/
        // restart button
        game.objects.restart_button.hide();
        game.text_left = engine.addText('', 95, 15, {font : ' 14px Arial'});
        game.objects.game_interface_group.addChild(game.text_left);
        game.logboard = new PIXI.MultiStyleText('', {
            def: { font: '14px Arial', fill: 'white' },
            sys: { font: '14px Arial', fill: 'yellow' },
            err: { font: '14px Arial', fill: 'red' }
        });
        game.objects.game_interface_group.addChild(game.logboard);
        if(username) {
	        // Добавление змейки
		    game.addSnake(100, 0, 0, username, username);
        }
        // Добавление ботов
		for(var i = 0; i < bot_nicknames.length; i++) {
			var r = Math.random() * (Math.PI * 2) - (Math.PI * 2);
			game.addSnake(Math.random() * 150 + 25, Math.random() * game.arena_radius * .9, Math.cos(r) * game.arena_radius * .9, bot_nicknames[i], bot_nicknames[i]);
		}
        game.leaderboard = new PIXI.MultiStyleText('', {
            def: { font: '14px Courier new', fill: 'white' },
            me: { font: '14px Courier new', fill: 'yellow' }
        });
        // game.leaderboard.rotation = (Math.PI / 180) * 2.5;
        game.objects.game_interface_group.addChild(game.leaderboard);
        // textSample.text = "<pixi>Pixi.js</pixi> can has <multiline>multiline</multiline>\nand <multistyle>multi-styles</multistyle> text!";
    },
    initControl: function() {
        // Включение ускорения хода змейки
        $(engine.renderer.view).mousedown(function(e){
        	var btn = e.originalEvent.button;
        	if(player = game.getPlayer()) {
        	    if(btn == 2) { // right button
        	    	if(player.speed == 1) {
				    	game.switchAutopilot();
					}
        	    } else if(btn == 0) { // left button
					if(!game.autopilot.on) {
		                if(player.size > 10) {
		                    player.speed = 2;
	                    } else {
							player.speed = 1;
						}
					}
			    }
            }
        }).mouseup(function(e){
        	if(player = game.getPlayer()) {
                player.speed = 1;
			}
        });
        // управление змейкой на смартфонах и планшетах
        document.addEventListener('touchmove', function(e) {
            var touchobj = e.changedTouches[0];
            var mouse_x = touchobj.clientX;
            var mouse_y = touchobj.clientY;
            game.mouse_x = mouse_x;
            game.mouse_y = mouse_y;
            e.preventDefault();
            return false;
        }, true);
    },
    resize: function() {
		if(game.leaderboard == null) {
			return;
		}
		var screen_scale = game.options.screen_scale;
		var width = engine.width * screen_scale;
		var height = engine.height * screen_scale;
        // ТОП-10 игроков на арене
        game.leaderboard.position.y = 20;
        game.leaderboard.position.x = width - 200;
        // логи/чат слева внизу
        game.logboard.position.y = height - 170;
        game.logboard.position.x = 20;
        // радар
        this.objects.radar.container.position.x = width - 120;
        this.objects.radar.container.position.y = height - 120;
        // фон
        this.tilingSprite.width = width;
        this.tilingSprite.height = height;
        game.objects.restart_button.move(width / 2, height / 2);
    },
    calcSnakeScale: function(snake_id) {
		var snake = this.getSnakeById(snake_id);
        var physical = this.options.calcPhysicalSize(snake.size);
        snake.scale = physical.scale / 2;
        var length = snake.ball_group.children.length;
		for(var i = 0; i < snake.ball_group.children.length; i++) {
			var child = snake.ball_group.getChildAt(i);
            var scale = snake.scale;
			child.scale.x = child.scale.y = scale;
		}
		snake.eyes.scale.x = snake.eyes.scale.y = snake.scale;
    },
    addSnake: function(size, x, y, nickname, id, skin_index, balls) {
        var snake_index = this.snakes.length;
        if(typeof skin_index == 'undefined' || skin_index === null) {
            skin_index = nickname.toLowerCase().charCodeAt(0) + 6;
            skin_index = skin_index % game.textures.snake.length;
        }
        var speed = 0;
        var radar_sprite = 'snake_enemy';
        if(id == client.logged_id) {
            $('#form-login').hide();
            game.x = -x;
            game.y = -y;
            speed = 1;
            radar_sprite = 'snake_my';
        }
        this.addLog(0, 'snake `' + nickname + '` added on position: ' + x + 'x' + y);
        var snake_texture = game.textures.snake[skin_index];
        var snake = {
            'id': id,
            'nickname': nickname,
            'speed': speed,
            'bot_rotate': 0,
            'bot_rotate_angle_target': 0,
            'bot_rotate_value': .3,
            'angleRadians': Math.random() * (Math.PI * 2) - (Math.PI * 2),
            'scale': 1,
            // Глазки
            'eyes': engine.createObject(new PIXI.Sprite(snake_texture.textures[0]), x, y, false, false, .5, .5),
            'balls': [],
            'ball_group': null, // Группа звеньев змейки
            'text': engine.addText('', x, y, {
				font: '14px Arial',
				strokeThickness: 1,
				dropShadow: false,
				fill : '#ffffff',
				wordWrap: false
	        }),
		    'sx': 0,
		    'sy': 0,
            'lifes': 100,
		    'skin_index': skin_index,
		    'size': 0,
            // 'radar_sprite': game.objects.radar.add(x / game.arena_radius * 100, y / game.arena_radius * 100, radar_sprite),
            'balls_server': []
		};

        // Змея
        // var snake = this.getSnakeById(id);
        snake.text.text = nickname;
		snake.text.visible = id != client.logged_id;
        snake.ball_group = engine.addGroup([snake.eyes], x, y, false, game.objects.snakes);
        snake.ball_group.x = x;
        snake.ball_group.y = y;
        snake.ball_group.filters = [game.filters.ball_shadow_filter];
        this.snakes.push(snake);
        if(typeof balls != 'undefined') {
			for(var i = 0; i < balls.length; i++) {
				var ball = {
					'x': balls[i][0],
					'y': balls[i][1],
					'rotation': balls[i][2] / (Math.pi / 180),
				};
				this.addBall(id, ball);
			}
        } else {
			for(var i = 0; i < size; i++) {
	            this.addBall(id);
			}
		}

        this.calcSnakeScale(id);
        return snake;
    },
    // уменьшение длины змейки
    removeBall: function(snake_id, new_size) {
        var snake = this.getSnakeById(snake_id);
		snake.size--;
        if(snake.balls.length > new_size) {
			snake.balls.splice(new_size);
		}
        this.calcSnakeScale(snake_id);
    },
    getSnakeById: function(id) {
        for(var si = 0; si < this.snakes.length; si++) {
            var snake = this.snakes[si];
            if(typeof snake != 'undefined') {
	            if('id' in snake) {
		            if(snake.id == id) {
		                return snake;
		            }
				}
			}
        }
        return null;
    },
    addBall: function(snake_id, properties) {
        var snake = this.getSnakeById(snake_id);
        if(snake == null) {
            return;
        }
        var skin_index = snake.skin_index;
        var snake_texture = game.textures.snake[skin_index].textures;
        var i = snake.balls.length;
        snake.size++;
		var ball = {
			texture_index: i % (snake_texture.length - 1) + 1,
			anchor: {x: 0, y: 0},
			vel: 0,
			point: 0,
			x: 0,
			y: 0,
			rotation: 0,
			visible: false
		};
		ball.anchor.y = ball.anchor.x = .5;
        ball.vel = 0;
		ball.points = 3;
		// snake.balls.unshift(ball);
		snake.balls.push(ball);
		if(i > 0) {
			if(typeof properties == 'undefined') {
				var child_prev = snake.balls[snake.balls.length - 2];
				ball.x = child_prev.x;
				ball.y = child_prev.y;
			} else {
				ball.x = properties.x;
				ball.y = properties.y;
				ball.rotation = properties.rotation;
			}
		} else {
            ball.x = snake.eyes.x;
            ball.y = snake.eyes.y;
        }
		/*if(i % 3 != 0) {
			ball.visible = false;
		}*/
        this.calcSnakeScale(snake_id);
    },
    addLog: function(from_server, text) {
        if(from_server == 0) {
            return;
        }
        this.log_records.push(text);
        if(this.log_records.length > 10) {
            this.log_records.shift();
        }
        this.logboard.text = Array(11 - this.log_records.length).join('\n') + this.log_records.join('\n');
    },
    // обновление статистики
    updateStat: function(){
        if(client.logged_id == null) {return;}
        var pn = engine.performance_now / 1000;
        // draw perfomanse stat
        var outbound = client.statistic.outbound;
        var inbound = client.statistic.inbound;
        var outbound_speed = Math.round(outbound / 1024 / pn) + '/s';
        var inbound_speed = Math.round(inbound / 1024 / pn) + '/s';
        var min = Math.floor(pn / 60);
        var sec = new String('0' + Math.round(pn % 60));
        sec = sec.substr(sec.length - 2, 2);
        var strings = [];
        strings.push('fps: ' + engine.fps_current);
        strings.push('time: ' + min + ':' + sec);
        if(typeof window.performance.memory != 'undefined') {
            strings.push('mem: ' + Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100 + 'Mb');
        }
        strings.push('place: ' + game.my_place);
        strings.push('map: ' + (game.arena_radius * 2) + 'x' + (game.arena_radius * 2));
        strings.push('tcp out: ' + Math.round(outbound / 1024) + ' Kb (' + outbound_speed + ')');
        strings.push('tcp in: ' + Math.round(inbound / 1024) + ' Kb (' + inbound_speed + ')');
        strings.push('видно еды: ' + game.objects.apples.apple_visible_count + '/' + game.objects.apples.getCount());
		strings.push('incoming events: ' + client.statistic.incoming_events);
		strings.push('room_name: ' + client.room_name);
        game.text_left.text = strings.join('\n');
    },
    draw: {
    	// Список игроков справа вверху
		leaderBoard: function(state_string){
            if(game.leaderboard == null) {
                return;
            }
            game.leaderboard.x = engine.width - 300;
			// game.leaderboard.text = state_string;
		}
    },
    changeAngle: function() {
        if(this.autopilot.on) {
            return;
        }
        if(player_snake = this.getPlayer()) {
            if(player_snake.lifes <= 0) {
                return;
            }
            // поворот за курсором
            mouseX = this.mouse_x;
            mouseY = this.mouse_y;
            var new_val = Math.atan2(engine.height / 2 - mouseY, engine.width / 2 - mouseX);
            // player_snake.angleRadians = new_val;
            /*
            // плавный поворот головы
            var rad_old = player_snake.angleRadians;
            if(rad_old < 0) { rad_old = Math.PI + (Math.PI + player_snake.angleRadians); }
            var rad_new = new_val;
            if(rad_new < 0) { rad_new = Math.PI + (Math.PI + new_val); }
            var new_angle = player_snake.angleRadians;
            if(Math.abs(rad_new - rad_old) > Math.PI) {
                if(rad_new > rad_old) {
                    new_angle = rad_old - (Math.PI * 2 / 360) * 20;
                    if(new_angle < rad_new) {
                        new_angle = rad_new;
                    }
                } else if(rad_new < rad_old) {
                    new_angle = rad_old + (Math.PI * 2 / 360) * 20;
                    if(new_angle > rad_new) {
                        new_angle = rad_new;
                    }
                }
            } else {
                if(rad_new > rad_old) {
                    new_angle = rad_old + (Math.PI * 2 / 360) * 20;
                    if(new_angle > rad_new) {
                        new_angle = rad_new;
                    }
                } else if(rad_new < rad_old) {
                    new_angle = rad_old - (Math.PI * 2 / 360) * 20;
                    if(new_angle < rad_new) {
                        new_angle = rad_new;
                    }
                }
            }
            if(new_angle > Math.PI) {
                new_angle = new_angle - Math.PI * 2;
            }
            new_val = new_angle;
            player_snake.angleRadians = new_val;*/
            var pos_data = [
                Math.round(new_val * 10000) / 10000,
                player_snake.speed
            ];
            if(game.prev_pos[0] != pos_data[0] || game.prev_pos[1] != pos_data[1]) {
                client.send(game.options.event.pos, pos_data);
            }
            game.prev_pos = pos_data;
        }
    },
    moveSnakes: function(snake_id) {

		if(game.pause) return;
        var pn = performance.now();
        if(game.move_snakes_timer == 0) {
            var time = 1;
        } else {
            var time = pn - game.move_snakes_timer;
        }
        game.move_snakes_timer = pn;
        time /= 4.5;

        // вычисление скорости движения + смена направления движения вслед за курсором
        for(var si in game.snakes) {
            if(game.snakes.hasOwnProperty(si)) {
                var snake = game.snakes[si];
	            if(snake.lifes > 1) {
	                // если ускорен, то уменьшаем длину змеи
	                if(snake.speed > 1) {
	                    if(snake.size > 10) {
	                        // game.removeBall(si);
	                    } else {
	                        snake.speed = 1;
	                    }
	                }
	                var vel = time * snake.speed;
	                snake.sx = Math.cos(snake.angleRadians) * vel;
	                snake.sy = Math.sin(snake.angleRadians) * vel;
	            } else {
	                snake.sx = 0;
	                snake.sy = 0;
	            }
        	}
        }

        // движение хвоста змейки вслед за головой
        for(var si in game.snakes) {
            if (game.snakes.hasOwnProperty(si)) {
                var snake = game.snakes[si];
                if(snake.id != snake_id) {continue;}
                if(snake.lifes <= 0) {continue;}
                if(snake.balls.length < 1) {continue;}
                var ball = snake.balls[0];
                if(snake.id == client.logged_id) {
                    // перемещение головы в новое место
                    // snake.eyes.x = ball.x = -game.x;
                    // snake.eyes.y = ball.y = -game.y;
                    ball.x -= snake.sx;
                    ball.y -= snake.sy;
					snake.eyes.x = ball.x;
					snake.eyes.y = ball.y;
                    // ориентация головы по направлению движения
                    if(!game.autopilot.on) {
	                    ball.rotation = snake.angleRadians + Math.PI / 2;
	                    snake.eyes.rotation = snake.angleRadians + Math.PI / 2;
					}
                    // т.к. змея постоянно меняет позицию, то мы ее должны постоянно центровать на экране
                    snake.ball_group.position.x = engine.width / 2 - ball.x;
                    snake.ball_group.position.y = engine.height / 2 - ball.y;
                } else {
                    // перемещение последней секции (голова) в новое место
                    snake.eyes.x = ball.x += snake.sx;
                    snake.eyes.y = ball.y += snake.sy;
                    // ориентация головы по направлению движения
                    ball.rotation = snake.angleRadians - Math.PI / 2;
                    snake.eyes.rotation = snake.angleRadians - Math.PI / 2;
                    // т.к. змея постоянно меняет позицию, то мы ее должны постоянно центровать на экране
                    snake.ball_group.position.x = game.x + engine.width / 2;
                    snake.ball_group.position.y = game.y + engine.height / 2;
                }
                // передвижение секторов тела змейки по прикольному (имитация настоящей змеи)
                for(var i = snake.balls.length - 1; i > 0; i--) {
                	var ball = snake.balls[i];
                	var ball_prev = snake.balls[i - 1];
                    var x1 = ball.x;
        			var y1 = ball.y;
                    var x2 = ball_prev.x;
        			var y2 = ball_prev.y;
        			var xdiff = x2 - x1;
        			var ydiff = y2 - y1;
        			// расстояние между точками
        			var distance = Math.pow((xdiff * xdiff + ydiff * ydiff), 0.5);
                    if(distance > 15) {
						// угол между точками
	        			var d = Math.atan2(y2 - y1, x2 - x1);
                        x1 = x2 - Math.cos(d) * 15;
                        y1 = y2 - Math.sin(d) * 15;
                        ball.rotation = ball_prev.rotation;
                        ball.x = x1;
                        ball.y = y1;
                    }
                }

                /*
				// тупое копирование предыдущего сектора тела змейки
                for(var i = snake.balls.length - 1; i > 0; i--) {
                	var ball = snake.balls[i];
                	var ball_prev = snake.balls[i - 1];
                    ball.rotation = ball_prev.rotation;
                    ball.x = ball_prev.x;
                    ball.y = ball_prev.y;
                }*/
                snake.text.x = snake.eyes.x + snake.ball_group.position.x - 25;
                snake.text.y = snake.eyes.y + snake.ball_group.position.y + 50;
                class_bezier.calc(snake);
            }
        }
        if(player_snake = game.getPlayer()) {
	        // Перемещение всех объектов на арене относительно центра головы змея игрока
	        if(player_snake.lifes > 0) {
	            // game.x += player_snake.sx;
	            // game.y += player_snake.sy;
	            var objx = Math.round(game.x + engine.width / 2);
	            var objy = Math.round(game.y + engine.height / 2);
                game.objects.apples.move(objx, objy);
	            game.tilingSprite.tilePosition.x = game.arena_objects.x = objx;
	            game.tilingSprite.tilePosition.y = game.arena_objects.y = objy;
	        }
	    }
    },
	commands: {
	    removeSnake: function(id) {
	        for(var si in game.snakes) {
	            if (game.snakes.hasOwnProperty(si)) {
		            var snake = game.snakes[si];
		            if(snake.id != id) {continue;}
		            snake.lifes = 0;
		            if(id != client.logged_id) {
	                    // game.objects.radar.remove(snake.radar_sprite);
			            snake.eyes.visible = snake.text.visible = false;
			            // snake.eyes.destroy(true);
						for(var i = snake.ball_group.children.length - 1; i >= 0; i--) {
							snake.ball_group.removeChild(snake.ball_group.children[i]);
						}
	                    game.objects.snakes.removeChild(snake.ball_group);
						delete game.snakes[id];
			            game.snakes.splice(si, 1);
					}
		            break;
	        	}
	        }
	    },
	    refreshAppleList: function(list) {
	        for(var i = 0; i < list.length; i++) {
	            var a = list[i];
	            game.objects.apples.add(a[0], a[1], a[2]);
	        }
	    },
	    refreshUserList: function(user_list) {
	        $.each(user_list, function(k, data) {
	            var exists = false;
	            $.each(game.snakes, function(k, snake){
	                if(snake.id == data.id) {
	                    exists = true;
	                }
	            });
	            if(!exists) {
	            	// size, x, y, nickname, id, skin_index, balls
	                game.addSnake(data.size, data.x, data.y, data.login, data.id, data.skin_index, data.balls);
	            }
	        });
	        $.each(game.snakes, function(k, snake){
	            var exists = false;
	            $.each(user_list, function(k, data) {
	                if(snake.id == data.id) {
	                    exists = true;
	                }
	            });
	            exists = true;
	            if(!exists) {
	                game.removeSnake(snake.id);
	            }
	        });
	    },
	    setPosition: function(data) {
            data = {
                'id': data.Id, // data[0],
                'angleRadians': data.AngleRadians, // data[1],
                'speed': data.Speed, // data[2],
                'x': data.X, // data[3],
                'y': data.Y, // data[4],
                'balls': []
            };
			if(snake = game.getSnakeById(data.id)) {
				if(data.id == client.logged_id) {
					snake.angleRadians = data.angleRadians;
					game.x = -data.x;
					game.y = -data.y;
					var objx = Math.round(game.x + engine.width / 2);
					var objy = Math.round(game.y + engine.height / 2);
					game.objects.apples.move(objx, objy);
					game.tilingSprite.tilePosition.x = game.arena_objects.x = objx;
					game.tilingSprite.tilePosition.y = game.arena_objects.y = objy;
					if(game.autopilot.on) {
						snake.eyes.rotation = data.angleRadians + Math.PI / 2;
					}
				} else {
					snake.angleRadians = data.angleRadians + Math.PI;
					snake.speed = data.speed;
					var ball = snake.balls[0];
					ball.x = data.x;
					ball.y = data.y;
				}
			}
			game.moveSnakes(data.id);
	    },
	    eat: function(data) {
            var delete_array_list = [];
            data = {
                'id': data[0],
                'x': data[1],
                'y': data[2],
                'points': data[3]
            };
            for (var k = game.objects.apples.apple_group.children.length - 1; k >= 0; k--) {
                var apple = game.objects.apples.apple_group.getChildAt(k);
	            if(apple.modifiers.real_x == data.x && apple.modifiers.real_y == data.y) {
                    delete_array_list.push(k);
	                // game.addBall(data.id);
	                if(data.id == client.logged_id) {
	                	var pn = performance.now();
	                	if(game.prev_eat_time == 0 || (pn - game.prev_eat_time > 50)) {
	                    	audio.plop.play();
	                    	game.prev_eat_time = pn;
						}
	                }
	            }
	        }
            if(delete_array_list.length > 0) {
                try {
                    for(var i = delete_array_list.length - 1; i >= 0; i--) {
                        var k = delete_array_list[i];
                        game.objects.apples.remove(k, data.points == 0);
                    }
                } catch(e) {
                    game.addLog(1, e);
                }
            }
            //if(data.points > 0) {
            //    game.addBall(data.id);
            //}
	    },
	    // у какой-то змейки уменьшилось количество точек (из-за ускорения)
	    updateSize: function(data) {
			var snake = game.getSnakeById(data.id);
			if(snake == null) {
				return;
			}
			if(data.value < snake.size) {
        		for(var i = data.value; i < snake.size; i++) {
					game.removeBall(snake.id, data.value);
        		}
			} else if(data.value > snake.size) {
				for(var i = 0; i < data.value - snake.size; i++) {
					game.addBall(data.id);
				}
			}
	    }
    }
};
