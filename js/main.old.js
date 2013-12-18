Modernizr.hasEvent('deviceOrientation');


var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

(function($) {
    $.fn.onEnter = function(func) {
        this.bind('keypress', function(e) {
            if (e.keyCode == 13) func.apply(this, [e]);    
        });               
        return this; 
     };
})(jQuery);

window.requestAnimFrame = (function(){
	return  
    window.requestAnimationFrame       ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame    ||
	function( callback ){ window.setTimeout(callback, 1000 / 60); }
});

function lerp(a,b,d){
    if(d>=1)d=1;
    if(d<=0)d=0;
	return a + (b - a) * d;
}

function diffdata(ov, nv, onlyprops, m) {
    var diff = null;
    for(prop in nv) {
        if(onlyprops) {
            if(onlyprops.indexOf(prop)<0) continue;
            if(prop == 'id') continue;
            if(!diff) diff = {};
            diff[prop] = nv[prop];
        }else {
            if(prop == 'id') continue;
            if(!diff) diff = {};
            diff[prop] = nv[prop];
        }
    }
    return diff;
}
function syncdata(ov, nv, onlyprops, m){
    for(prop in nv) {
        if(onlyprops) {
            if(onlyprops.indexOf(prop)<0) continue;
            //if(prop == 'id') continue;
            ov[prop] = nv[prop];
        }else {
            //if(prop == 'id') continue;
            ov[prop] = nv[prop];
        }
    }
}


$.mobile.ignoreContentEnabled = true;
$(function() { 

	$.mobile.ignoreContentEnabled = true;

    var socketdata = {};
    socketdata.room = {};
    socketdata.player = {};

    var App = function(){
    	//init, joinRoom, room, confirmedGameStart, game, gameEnded
    	this.stat = null;
    	this.addedDeviceOrientationEvent = false;

    	this.setStat = function(s){
    		if(s==this.stat)return;
    		this.stat=s;
    		if(s=='init'){
    			$('.contViewer').hide();
    			$('.contController').hide();

				$('.contJoinRoom').hide();
				$('.contJoinRoom [type=button]').on('vclick', function(){
					if($(this).prop('disabled'))return;
					$('.contJoinRoom input').prop('disabled', true);
					$('.contJoinRoom .label').html('joining...');
					socketdata.player.role = $(this).attr('data');
					socketdata.room.id = $('.contJoinRoom input').val().trim();
					joinRoom();
				});
    			
    			$('.contRoom').hide();
				$('.contRoom #confirmedGameStart[type=button]').on('vclick', function(){
					if($(this).prop('disabled'))return;
					$(this).prop('disabled', true);
					$('.contRoom .customizePlayer input').prop('disabled', true);
					updatePlayer({confirmedGameStart:true});
				});

				$('.contRoom .pickColor [type=button]').on('vclick', function(){
					if($(this).prop('disabled'))return;
					socketdata.player.color = $(this).attr('data');
					updatePlayer({color:socketdata.player.color});
				});

				$('.contRoom .pickAvatar [type=button]').on('vclick', function(){
					if($(this).prop('disabled'))return;
					socketdata.player.avatarId = $(this).attr('data');
					updatePlayer({avatarId:socketdata.player.avatarId});
				});

				$('.contRoom input[name=txtName]').onEnter(function(){
					if($(this).prop('disabled'))return;
					socketdata.player.name = $(this).val().trim();
					updatePlayer({name:socketdata.player.name});
				});

                $('.contRoom input[name=btnTxtName]').on('vclick', function(){
                    if($(this).prop('disabled'))return;
                    socketdata.player.name = $('.contRoom input[name=txtName]').val().trim();
                    updatePlayer({name:socketdata.player.name});
                });

				$('.contRoom #gameStart').on('vclick', function(){
					if($(this).prop('disabled'))return;
					$(this).prop('disabled', true);
					updateGame({stat:'ready'});
				});
                $('.contRoom .gameReady').html('Game Ready Count Down');

                $('.contGame .playerBall').css({left:0, top:0});
				$('.contGame').hide();

                $('.contDisconnect').hide();
    			if(!this.addedDeviceOrientationEvent) {
    				if(isMobile.any()) {
    					this.addedDeviceOrientationEvent=true;
		            	window.addEventListener('deviceorientation', app.onDeviceOrientation);
		        	}
    			}
    			this.animate();
    		}else if(s=='joinRoom'){
    			$('.contViewer').show();
    			$('.contJoinRoom').show();
    		}else if(s=='room'){
    			if(socketdata.player.role == 'viewer'){ $('.contViewer').show(); $('.contController').hide(); }
    			else if(socketdata.player.role == 'controller'){ $('.contViewer').hide(); $('.contController').show(); }
    			$('.contRoom').show();
    			$('.contJoinRoom').hide();
    			this.updateRoom();
    		}else if(s=='game'){
    			$('.contGame').show();
    			$('.contRoom').hide();
    		}else if(s=='disconnect'){
                $('.content').hide();
                $('.contDisconnect').show();
                this.setStat('destroy');
            }else if(s=='destroy'){
                socket.disconnect(true);
                window.removeEventListener('deviceorientation', app.onDeviceOrientation);
            }
    	}
        this.syncplayer=function(player){
            if(player.id==socketdata.player.id){
                syncdata(socketdata.player,player);
            }
            for(key in socketdata.room.players) {
                if(socketdata.room.players[key].id == player.id) {
                    syncdata(socketdata.room.players[key],player);
                    break;
                }
            }
        }
        this.indexOfPlayer = function(id){
            var ind = 0;
            if(!socketdata.room.players) return -1;
            for(key in socketdata.room.players) {
                //console.log(socketdata.room.players[key].id,id);
                if(socketdata.room.players[key].id == id){
                    return ind; 
                }
                ind++;
            }
            return -1;
        }
        this.removePlayer = function(id){
            var ind = app.indexOfPlayer(id);
            if(ind>=0) socketdata.room.players.splice(ind, 1);
        }
        this.getPlayer = function(ind) {
            var i = 0;
            for(key in socketdata.room.players) {
                if(socketdata.room.players[key].role == 'controller') {
                    if(ind == i)
                        return socketdata.room.players[key];
                    i++;
                }
            }
            return null;
        }

    	this.doLastTime = 0;
    	this.doUpdateTimeOut = 50;
    	this.onDeviceOrientation=function(event){
    		try{
                if(event.beta == null || event.gamma == null || event.alpha == null) return;

                var data = {id:socketdata.player.id, gyrodata:{x:event.alpha, y:event.beta, z:event.gamma, t:Date.now()}};
                if(data.gyrodata.x>=0&&data.gyrodata.x<=180) data.gyrodata.x *= -1;
                else data.gyrodata.x = 360 - data.gyrodata.x;
                app.applyLowPassFilter(data.gyrodata, app.smoothed);
                data.gyrodata = app.smoothed;

	    		if(socketdata.room.game.stat != 'started') return;

		        if(Date.now() - app.doLastTime < app.doUpdateTimeOut ) return;
				app.doLastTime = Date.now();

		        updatePlayer(data);
		        app.updateGame();
		        g = data.gyrodata;
	    	}finally{

	    	}
	    }

        this.smoothed = {x:0, y:0, z:0};
        this.filteringFactor = 0.5;
        this.applyLowPassFilter = function (r, s) {
              s.x = (r.x * app.filteringFactor) +
                          (s.x * (1.0 - app.filteringFactor));
              s.y = (r.y * app.filteringFactor) + 
                          (s.y * (1.0 - app.filteringFactor));
              s.z = (r.z * app.filteringFactor) + 
                          (s.z * (1.0 - app.filteringFactor));
        }

    	this.updateRoom=function(){
    		$('.contRoom .roomProfile').html(sprintf('room.id=%s, room.stat=%s', socketdata.room.id, socketdata.room.stat));
            $('.contRoom .gameProfile').html(sprintf('game.stat=%s, game.startTime=%s', socketdata.room.game.stat, socketdata.room.game.startTime));
    		if(socketdata.player.role == 'viewer') {
	    		$('.contRoom .playerProfiles ul').empty();
	    		for(key in socketdata.room.players) {
	    			player = socketdata.room.players[key];
	    			if(player.role == 'controller') {
	    				$('.contRoom .playerProfiles ul').append(
    						$('<li class="label playerProfile"></li>').html(
    							sprintf('id=%s, name=%s, color=%s, avatarId=%s, role=%s, confirmedGameStart=%s, isHost=%s, startTime=%s', 
    							player.id, player.name, player.color, player.avatarId, player.role, player.confirmedGameStart, player.isHost, player.startTime)));
	    			}
	    		}
    		}else if(socketdata.player.role == 'controller') {
    			player = socketdata.player;
    			$('.contRoom .playerProfile').html(
    				sprintf('id=%s, name=%s, color=%s, avatarId=%s, role=%s, confirmedGameStart=%s, isHost=%s, startTime=%s', 
    						player.id, player.name, player.color, player.avatarId, player.role, player.confirmedGameStart, player.isHost, player.startTime));
    			$('.contRoom input[name=txtName]').val(player.name);

    			if(socketdata.room.stat == 'confirmedGameStart' && socketdata.player.isHost) {
    				$('.contRoom #gameStart').show();
    			}else{
					$('.contRoom #gameStart').hide();
    			}
    		}
    	}
    	this.updateGame=function(){
    		$('.contGame .roomProfile').html(sprintf('room.id=%s, room.stat=%s', socketdata.room.id, socketdata.room.stat));
    		$('.contGame .gameProfile').html(sprintf('game.stat=%s, game.startTime=%s', socketdata.room.game.stat, socketdata.room.game.startTime));
    		if(socketdata.player.role == 'viewer') {
	    		$('.contGame .playerProfiles ul').empty();
                i=0;
	    		for(key in socketdata.room.players) {
	    			player = socketdata.room.players[key];
	    			g = player.gyrodata;
	    			if(player.role == 'controller') {
	    				$('.contGame .playerProfiles ul').append(
    						$('<li class="label playerProfile"></li>').html(
    							sprintf('id=%s, name=%s, color=%s, avatarId=%s, role=%s, gyrodata=%s, life=%s, score=%s, isHost=%s', 
    							player.id, player.name, player.color, player.avatarId, player.role, (g?sprintf('[%.0f,%.0f,%.0f,%d]',g.x,g.y,g.z,g.t):""), player.life, player.score, player.isHost)));
                        i++;
	    			}
	    		}
    		}else if(socketdata.player.role == 'controller') {
    			player = socketdata.player;
    			g = player.gyrodata;
    			$('.contGame .playerProfile').html(
    				sprintf('name=%s, color=%s, avatarId=%s, gyrodata=%s, life=%s, score=%s', 
    						player.name, player.color, player.avatarId, (g?sprintf('[%.0f,%.0f,%.0f,%d]',g.x,g.y,g.z,g.t):""), player.life, player.score));
    		}
    	}
    	this.playanim=function(s){
    		console.log('playanim',s)
    		if(s=='readyGameStart'){
    			var countdown = 4;
    			$('.gameReady').html(countdown);
    			var cditvl = setInterval(function(){
    				console.log('countdown='+countdown);
    				countdown--;
    				if(countdown>=0) $('.gameReady').html(countdown);
    				else{
    				 	$('.gameReady').html('loading');
    				 	clearInterval(cditvl);
    				}
    			}, 1000); 
    		}
    	}

    	this.animLastTime = 0;
    	this.animDeltaTime = 0;
    	this.animate = function() {
            try{
        		if(app.animLastTime == 0) { app.animLastTime = 0; app.animLastTime = Date.now() / 1000.0; }
        		else {app.animLastTime = Date.now()/1000.0 - app.animLastTime; app.animLastTime = Date.now() / 1000.0; }
    		    app.animatePlayerBalls();
            }finally{
                window.requestAnimationFrame(app.animate); 
            }
    	}



    	this.animatePlayerBalls = function(){
            if(socketdata.player.role != 'viewer') return;
            var i = 0;
            for(key in socketdata.room.players){
                player = socketdata.room.players[key];
                if(player.role == 'controller' && player.gyrodata) {
                    pb = $('.contGame .playerBall[data='+i+']');
                    left = parseInt(pb.css('left'));
                    tp = parseInt(pb.css('top'));
        			newleft = lerp(left, player.gyrodata.x*15, app.animDeltaTime * 20);
        			newtop = lerp(tp, -player.gyrodata.y*15, app.animDeltaTime * 20);
        			pb.css({'left':newleft, 'top':newtop});
                    i++;
                }
    		}
    	}
    }

    var app = new App();
	//var socket = io.connect('http://10.60.8.42:8080');
    //var socket = io.connect('http://110.74.145.170:37001');
    var socket = io.connect('http://10.60.2.133:37001', {reconnect:false});
	socket.on('connectClient', function (data){
		var n = 'connectClient';
		//console.log(n, data);
		syncdata(socketdata.player, data.player);
		if(!isMobile.any()) {
			socketdata.player.role = 'viewer';
			joinRoom();
		}else{
            socketdata.player.role = 'controller';
			app.setStat('joinRoom');
		}
	});
	socket.on('error', function(data){
		var n = 'error';
		console.log(n, data);
	});

	/////////////////////////////
	socket.on('disconnectRoom', function (data){
		var n = 'disconnectRoom';
		//console.log(n, data);
        app.removePlayer(data.player.id);
		console.log(socketdata.room.players);
		app.updateRoom();
		app.updateGame();
	});

	function joinRoom(data){
		var n = 'f:joinRoom';
		console.log(n);
		socket.emit('joinRoom', {player:{role:socketdata.player.role}, room:{id:socketdata.room.id}});
	}

	socket.on('joinRoom', function (data){
		var n = 'joinRoom';
		//console.log(n, data);
		if(data.player.id == socketdata.player.id) {
			//response from self joinRoom
			$('.contJoinRoom input').prop('disabled', false);
			$('.contJoinRoom .label').html(data.e ? data.e : '');
			if(data.e) return;
			syncdata(socketdata.room, data.room);
            if(socketdata.room.game.stat == 'started') {
                app.setStat('game');
            }else{
                app.setStat('room');
            }
		}else{
			//broadcasted from other joinRoom
			if(data.e) return;

			syncdata(socketdata.room, data.room);
			app.updateRoom();
			app.updateGame();
		}
		
		
	});

	socket.on('updateRoom', function (data){
		var n = 'updateRoom';
		//console.log(n, data);
		syncdata(socketdata.room, data.room);
		app.updateRoom();
		app.updateGame();
	});
	/////////////////////////////
	function updatePlayer(data){
		var n = 'f:updatePlayer';
        data.id=socketdata.player.id;
		app.syncplayer(data);
		app.updateRoom();
		app.updateGame();
        socket.emit('updatePlayer', {player:data});
	}

	socket.on('updatePlayer', function (data){
		var n = 'updatePlayer';
		//console.log(n, data);
        app.syncplayer(data.player);
		app.updateRoom();
		app.updateGame();
	});
	/////////////////////////////
	function updateGame(data){
		var n = 'f:updateGame';
		//console.log(n);
        syncdata(socketdata.room.game,data);
		socket.emit('updateGame', {game:data});
	}

	socket.on('updateGame', function (data){
		var n = 'updateGame';
		console.log(n, data);
		if(data.game.stat == 'ready') {
            app.playanim('readyGameStart');
		}else if(data.game.stat == 'started') {
			app.setStat('game');
		}
        syncdata(socketdata.room.game, data.game);
		app.updateGame();
	});

	////////////////////////////
    socket.on('disconnect', function (data) {
        var n = 'disconnect';
        console.log(n, data);
        app.setStat('disconnect');
    });
    ////////////////////////////
	app.setStat('init');

    function onServerError(o, n){
        //o=error 

    }

    function onServerError(n,o,e){}
    function onDisconnected(){}
    function onConnected(data){}

    function modifyRoom(data){}
    function onRoomModified(data){}

    function onGameReady(data){}
    function onGameStarted(data){}
    function onGameEnded(data){}

    function viewerAction(data){}
    function onViewerAction(data){}

    function modifyPlayer(data){}
    function onAnyPlayerModified(data,ind){}
    function onPlayerModified(data,ind){}
    function onOtherPlayerModified(data,ind){}
    function playerAction(data){}
    function onPlayerAction(data){}
    function onPlayerJoined(data){}
    function onPlayerLeave(data){}
    function onPlayerConfirmed(data){}
    function onPlayerGameStart(data){}












});