// connection_properties.js

var connection_properties = {
    'Login': '',
    'SkinIndex': 0,
    'ServerName': 'my_server',
    'StartSnakeSize': 10,
    'ArenaRadius': 2000,
    'AddApplesOnCollisionWall': false,
    'KillOnCollisionSnakes': true,
    'AppleIntensive': 1,
    "ConnectTypeName": "connect",   // "connect" - free connect
                                    // "create" - create_server
                                    // "enter" - enter to specific room
    'load': function(){
        this.Login = localStorage.getItem('Login') ? localStorage.getItem('Login') : 'user' + Math.round(Math.random() * 1024);
        this.SkinIndex = localStorage.getItem('SkinIndex') ? parseInt(localStorage.getItem('SkinIndex')) : this.SkinIndex;
        this.ServerName = localStorage.getItem('ServerName') ? localStorage.getItem('ServerName') : this.ServerName;
        this.StartSnakeSize = localStorage.getItem('StartSnakeSize') ? localStorage.getItem('StartSnakeSize') : this.StartSnakeSize;
        this.ArenaRadius = localStorage.getItem('ArenaRadius') ? localStorage.getItem('ArenaRadius') : this.ArenaRadius;
        this.AddApplesOnCollisionWall = localStorage.getItem('AddApplesOnCollisionWall') ? localStorage.getItem('AddApplesOnCollisionWall') : this.AddApplesOnCollisionWall;
        this.KillOnCollisionSnakes = localStorage.getItem('KillOnCollisionSnakes') ? localStorage.getItem('KillOnCollisionSnakes') : this.KillOnCollisionSnakes;
        this.AppleIntensive = localStorage.getItem('AppleIntensive') ? localStorage.getItem('AppleIntensive') : this.AppleIntensive;
        // Вычитка сохраненных параметров входа
        $('#input_Login').val(this.Login).focus().select();
        $('#input_SkinIndex').val(this.SkinIndex);
        $('#input_ServerName').val(this.ServerName);
        $('#input_StartSnakeSize').val(this.StartSnakeSize);
        $('#input_ArenaRadius').val(this.ArenaRadius);
        $('#input_AddApplesOnCollisionWall').prop('checked', this.AddApplesOnCollisionWall == 'true');
        $('#input_KillOnCollisionSnakes').prop('checked', this.KillOnCollisionSnakes == 'true');
        $('#input_AppleIntensive').val(this.AppleIntensive);
        $('.skin:eq(' + this.SkinIndex + ')').addClass('active');
    },
    'save': function(){
        localStorage.setItem('Login', this.Login);
        localStorage.setItem('SkinIndex', this.SkinIndex);
        localStorage.setItem('ServerName', this.ServerName);
        localStorage.setItem('StartSnakeSize', this.StartSnakeSize);
        localStorage.setItem('ArenaRadius', this.ArenaRadius);
        localStorage.setItem('AddApplesOnCollisionWall', this.AddApplesOnCollisionWall);
        localStorage.setItem('KillOnCollisionSnakes', this.KillOnCollisionSnakes);
        localStorage.setItem('AppleIntensive', this.AppleIntensive);
    }
};

function start() {
    $('#btn-start').addClass('disabled');
    connection_properties.Login = $('#input_Login').val();
    // connection_properties.SkinIndex = parseInt($('#input_SkinIndex').val()); // (Login.toLowerCase().charCodeAt(0) + 6) % game.textures.snake.length;
    // сохранение введенного логина, чтобы в будущем пользователь не вводил его заново
    connection_properties.save();
    client.start(connection_properties);
    return false;
}

function skinPreview() {
    var item = game.options.snake_textures[connection_properties.SkinIndex];
    $('#current_skin_preview').html('<a href="#" onclick="return showSelectSkin();" style="display: inline-block; background: url(/static/img/snake/' + item.name + '.png) no-repeat left bottom; width: 128px; height: 128px; zoom: .5;"></a>');
}

function showSelectSkin() {
    $('#skin_list').fadeToggle('fast');
    return false;
}

$(function(){

    connection_properties.load();

    // создать сервер
    $('#btn-create_server').on('click', function(e){
        $('#create_server').fadeToggle();
    });

    // присоединиться
    $('#btn-enter_to_server').on('click', function(e){
        var temp = window.prompt('Введите название сервера', '');
        if(temp == null) {
            return;
        }
        connection_properties.ServerName = temp;
        connection_properties.ConnectTypeName = 'enter';
        return start();
    });

    // создать сервер
    $('#btn-create_server_apply').on('click', function(e){
        connection_properties.ServerName = $('#input_ServerName').val();
        connection_properties.StartSnakeSize = parseInt($('#input_StartSnakeSize').val());
        connection_properties.ArenaRadius = parseInt($('#input_ArenaRadius').val());
        connection_properties.AppleIntensive = parseInt($('#input_AppleIntensive').val());
        connection_properties.AddApplesOnCollisionWall = $('#input_AddApplesOnCollisionWall').is(':checked');
        connection_properties.KillOnCollisionSnakes = $('#input_KillOnCollisionSnakes').is(':checked');
        connection_properties.ConnectTypeName = 'create';
        connection_properties.save();
        return start();
    });

    // начать игру на случайном сервере
    $('#btn-start').removeClass('disabled').on('click', function(){
        if($(this).hasClass('disabled')) {
          return false;
        }
        return start();
    });

    for(var i = 0; i < game.options.snake_textures.length; i++) {
        var item = game.options.snake_textures[i];
        $('#skin_list').append('<div class="skin"><div style="background: url(/static/img/snake/' + item.name + '.png) no-repeat left bottom; width: '+item.size+'px; /*-moz-transform: scale(' + (64 / item.size) + ');*/ -ms-zoom: ' + (64 / item.size) + '; -webkit-zoom: ' + (64 / item.size) + '; zoom: ' + (64 / item.size) + '; height: '+item.size+'px;"></div></div>');
    }

    skinPreview();

    // Select skin
    $('.skin').on('click', function(e){
        $('.skin').removeClass('active');
        $(this).addClass('active');
        connection_properties.SkinIndex = parseInt($(this).index());
        skinPreview();
        $('#skin_list').fadeOut();
        $('#input_SkinIndex').val(connection_properties.SkinIndex);
    });

});
