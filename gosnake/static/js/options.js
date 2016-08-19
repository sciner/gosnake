// options.js
// ========
module.exports = {
    start_snake_size: 10,
    arena_radius: 20000,
    cell_size: 1000,
    head_cell_radius_radius: 50,
    apple_intensive: 1,
    snake_radius: 26,
    screen_scale: 1,
    kill_on_collision_snakes: true, // убивать змейку, которая коснулась другую змейку
    snake_textures: [
        {name: 'first', size: 128, length: 20},
        {name: 'fox', size: 128, length: 2},
        {name: 'alien', size: 128, length: 2},
        {name: 'pig', size: 128, length: 2},
        {name: 'hippo', size: 128, length: 2},
        {name: 'zoma', size: 128, length: 2},
        {name: 'captain', size: 128, length: 2},
        {name: 'panda', size: 128, length: 2},
        //{name: 'i', size: 64, length: 2},
        //{name: 'j', size: 64, length: 2},
        //{name: 'k', size: 64, length: 2},
        {name: 'l', size: 128, length: 20},
        //{name: 'pencil', size: 64, length: 2},
        {name: 'cat', size: 128, length: 2}
        // {name: 'car', size: 128, length: 1}
    ],
    event: {
    	// частые команды с коротким кодом
		pos: 			1,
		eat: 			2,
		upd_points: 	3,
		apple: 			4,
		radar: 			5,
		// редкие команды, поэтому они с длинным кодом
		user_joined: 	10,
		user_exit: 		11,
		user_list: 		12,
		msg: 			13,
		connected: 		14,
		login: 			15,
		ping: 			16,
		pong: 			17,
		autopilot: 		18,
		user_show:   19, // as user_joined
		user_hide:   20, // as user_exit
    },
    calcPhysicalSize: function(size) {
        var factor = (size / 500);
        var scale = Math.min(1 + factor, 2);
        radius = this.snake_radius * scale;
        return {
            'scale': scale,
            'radius': radius,
        };
    }
};
