/**
* Game engine v 0.0.1
* @2016-2021
*/
if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
	var VERSION = '0.0.1';
	var type = 'websocket';
    var args = [
        '\n %c %c %c GOsnake ' + VERSION + ' - ✰ ' + type + ' ✰  %c ' + ' %c ' + ' GO + JS %c %c ♥%c♥%c♥ \n\n',
        'background: #ff66a5; padding:5px 0;',
        'background: #ff66a5; padding:5px 0;',
        'color: #ff66a5; background: #030307; padding:5px 0;',
        'background: #ff66a5; padding:5px 0;',
        'background: #ffc3dc; padding:5px 0;',
        'background: #ff66a5; padding:5px 0;',
        'color: #ff2424; background: #fff; padding:5px 0;',
        'color: #ff2424; background: #fff; padding:5px 0;',
        'color: #ff2424; background: #fff; padding:5px 0;'
    ];
    window.console.log.apply(console, args); //jshint ignore:line
}

window.performance = window.performance || {};
performance.now = (function() {
  return performance.now       ||
         performance.mozNow    ||
         performance.msNow     ||
         performance.oNow      ||
         performance.webkitNow ||
         function() { return new Date().getTime(); };
})();

var engine = {

	frames: 0,
    width: 0,
    height: 0,
    fps_current : 0,
    fps_counter: 0,
    fps_calc_begin: 0,
    performance_now: 0,
    dragging: false,
    stage: null,
    renderer: null,
    animate: function(){},
    container: null,

	init: function(container_id, width, height) {
		this.container = new PIXI.Container();
        var screen_scale = game.options.screen_scale;
		width = window.innerWidth * screen_scale;
		height = window.innerHeight * screen_scale;
        this.width = width;
        this.height = height;
        this.renderer = PIXI.autoDetectRenderer(width, height);
		// this.renderer = new PIXI.WebGLRenderer(width, height);
		this.renderer.view.style.width = window.innerWidth + 'px';
		this.renderer.view.style.height = window.innerHeight + 'px';
		this.renderer.view.style.display = 'block'
        this.renderer.backgroundColor = 0xFFFFFF;
        if(this.renderer instanceof PIXI.WebGLRenderer) {
            // this.renderer.context.mozImageSmoothingEnabled = false
            // this.renderer.context.webkitImageSmoothingEnabled = false;
        }
        $('body').append(this.renderer.view);
		// document.body.appendChild(this.renderer.view);
		// this.stage = new PIXI.Stage(0x97c56e, true);
        // this.stage.addChild(this.container);
		this.stage = this.container;
        this.stage.interactive = true;
        this.stage.on('mousemove', function(mouseData){
            game.mouse_x = engine.renderer.plugins.interaction.mouse.global.x;
            game.mouse_y = engine.renderer.plugins.interaction.mouse.global.y;
        });
        window.onresize = function() {
        	var screen_scale = game.options.screen_scale;
            var w = Math.ceil(window.innerWidth);
            var h = Math.ceil(window.innerHeight);
            engine.width = w;
            engine.height = h;
            engine.renderer.view.style.width = w + 'px';
            engine.renderer.view.style.height = h + 'px'; 
            engine.renderer.resize(w* screen_scale, h* screen_scale);
            game.resize();
        };
        /*
        var screen_scale = 1;
        engine.renderer.resize(engine.renderer.width * screen_scale, engine.renderer.height * screen_scale);
        engine.width = engine.renderer.width;
        engine.height = engine.renderer.height;
        */
	},

    draw: function() {
        var pn = performance.now();
        if(engine.performance_now > 0) {
            var time = (pn - engine.performance_now);
        } else {
            var time = 0;
        }
        engine.fps_counter++;
        if(engine.fps_calc_begin == 0) {
            engine.fps_calc_begin = performance.now();
        } else {
            var n = (performance.now() - engine.fps_calc_begin) / 1000;
            if(n > 1) {
                engine.fps_current = Math.round(engine.fps_counter * n);
                engine.fps_counter = 0;
                engine.fps_calc_begin = performance.now();
            }
        }
        engine.performance_now = pn;
        engine.animate(++engine.frames, time, engine.fps_current);
        requestAnimationFrame(engine.draw);
        // window.setTimeout(engine.draw, 1000 / 300);
        engine.renderer.render(engine.stage);
    },

	addGroup: function(sprites, x, y, dragging, container) {
		// create the stuffs
		var group1 = new PIXI.Container();
		// add the sprites
		$.each(sprites, function(k, v){
			group1.addChild(v);
		});
		this.addObject(group1, x, y, false, dragging, container);
		return group1;
	},

	/**
	* Создание объекта
	*/
	createObject: function(sprite, x, y, hover, dragging, cx, cy) {

		// центр координат объекта
		if(typeof sprite.anchor != 'undefined') {
			sprite.anchor.set(cx, cy);
		}
		sprite.position.x = x;
		sprite.position.y = y;

		if(hover || dragging) {
			// make the interactive...
			sprite.interactive = true;
			sprite.buttonMode = true;
		}

		// смена спрайта при наведении
		if(hover) {
			sprite.mouseover = function(event) {
                if(engine.dragging) {
                    return false;
                }
			    this.gotoAndStop(1);
			};
			sprite.mouseout = function(event) {
                if(engine.dragging) {
                    return false;
                }
			    this.gotoAndStop(0);
			};
		}

		// таскаемый
		if(dragging) {

			// use the mousedown and touchstart
			sprite.mousedown = sprite.touchstart = function(event) {
                if(engine.dragging) {
                    return;
                }
			    this.data = event.data;
                this.dragging = true;
			    engine.dragging = true;
			    this.sx = this.data.getLocalPosition(sprite).x * sprite.scale.x;
			    this.sy = this.data.getLocalPosition(sprite).y * sprite.scale.y;
			};
			// set the events for when the mouse is released or a touch is released
			sprite.mouseup = sprite.mouseupoutside = sprite.touchend = sprite.touchendoutside = function(event) {
			    this.dragging = false;
                engine.dragging = false;
			    // set the interaction data to null
			    this.data = null;
			};
			// set the callbacks for when the mouse or a touch moves
			sprite.mousemove = sprite.touchmove = function(event) {
			    /*if(this.dragging) {
			        // need to get parent coords..
			        var newPosition = this.data.getLocalPosition(this.parent);
			        var x = newPosition.x - this.sx;
			        var y = newPosition.y - this.sy;
                    var container = engine.renderer;
                    // var container = this.parent;
			        if(this.width < container.width || this.height < container.height) {
			            x = Math.max(x, this.width - this.width * (1 - this.anchor.x));
			            y = Math.max(y, this.height - this.height * (1 - this.anchor.y));
			            x = Math.min(x, container.width - this.width * (1 - this.anchor.x));
			            y = Math.min(y, container.height - this.height * (1 - this.anchor.y));
			        } else {
			            x = Math.min(x, 0);
			            y = Math.min(y, 0);
						x = Math.max(x, engine.renderer.width - this.width);
						y = Math.max(y, engine.renderer.height - this.height);
			        }
			        this.position.x = x;
			        this.position.y = y;
			    }*/
			}
		}

		return sprite;

	},

	/**
	* Добавление объекта на сцену
	*/
	addObject: function(sprite, x, y, hover, dragging, container) {
	// group1, x, y, false, dragging, 0, 0, container
		if(typeof container === 'undefined' || !container) {
			container = this.container;
		}
		container.addChild(this.createObject(sprite, x, y, hover, dragging));
	},

	addText: function(text, x, y, font_style) {
		var style = {
		    font : 'bold italic 23px Arial',
		    fill : '#F7EDCA',
		    // stroke : '#4a1850',
		    // strokeThickness : 5,
		    dropShadow: false,
		    // dropShadowColor : '#000000',
		    // dropShadowAngle : Math.PI / 6,
		    // dropShadowDistance : 6,
		    wordWrap: false,
		    // wordWrapWidth: 440
		};
		if(typeof font_style == 'undefined') {
			font_style = {};
		}
		$.extend(style, font_style);
		var richText = new PIXI.Text(text,style);
		this.addObject(richText, x, y, false, false, null);
		return richText;
	},
    
    addTile: function(sprite, container) {
		if(typeof container === 'undefined' || !container) {
			container = this.container;
		}
        // create a texture from an image path
        var texture = PIXI.Texture.fromImage(sprite);
        // create a tiling sprite ... requires a texture, a width and a height in WebGL the image size should preferably be a power of two
        var tilingSprite = new PIXI.extras.TilingSprite(texture, this.width, this.height);
        container.addChild(tilingSprite);
        return tilingSprite;
    }

};
