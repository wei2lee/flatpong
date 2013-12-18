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
	return  window.requestAnimationFrame       ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame    ||
	function( callback ){
	window.setTimeout(callback, 1000 / 60);
};

function lerp(a,b,d){
	return a + (b - a) * d;
}


$.mobile.ignoreContentEnabled = true;
$(function() { 
	console.log([]==false,[1]==false,[0]==false);

	$.mobile.ignoreContentEnabled = true;
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
    function syncplayer_from_players(players) {
    	for(key in players) {
    		if(players[key].id == socketdata.player.id) {
    			syncdata(socketdata.player, players[key]);
    			break;
    		}
    	}
    }
    function syncplayers_from_player(player) {
    	for(key in socketdata.room.players) {
    		if(socketdata.room.players[key].id == player.id) {
    			syncdata(socketdata.room.players[key], player);
    			break;
    		}
    	}
    }


    function getRoomPlayerById(id){
    	if(!socketdata.room.players) return null;
    	for(key in socketdata.room.players)
    		if(socketdata.room.players[key].id == id) return socketdata.room.players[key];
    	return null;
    }
    function getRoomPlayerIndById(id){
    	var ind = 0;
    	if(!socketdata.room.players) return -1;
    	for(key in socketdata.room.players) {
    		console.log(socketdata.room.players[key].id,id);
    		if(socketdata.room.players[key].id == id){

    			return ind; 
    		}
    		ind++;
    	}
    	return -1;
    }



    var socketdata = {};
    socketdata.room = {};
    socketdata.player = {};

    var App = function(){
    	//init, room, confirmedGameStart, gameInit, gameStarted, gameEnded
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
				$('.contRoom #gameStart').on('vclick', function(){
					if($(this).prop('disabled'))return;
					$(this).prop('disabled', true);
					updateGame({stat:'init'});
					app.playanim('confirmedGameStart');
				});


				$('.contGame').hide();

    			if(!this.addedDeviceOrientationEvent) {
    				//if(socketdata.player.id && socketdata.player.role == 'controller') {
    					this.addedDeviceOrientationEvent=true;
		            	window.addEventListener('deviceorientation', app.onDeviceOrientation);
		        	//}
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
    		}
    	}


    	this.doLastTime = 0;
    	this.doUpdateTimeOut = 250;
    	this.onDeviceOrientation=function(event){
    		try{
	    		if(!socketdata.player || socketdata.player.role != 'controller') return;
	    		if(!socketdata.room || !socketdata.room.game || !socketdata.room.game.stat) return;
		        if(event.beta == null || event.gamma == null || event.alpha == null) return;
		        if(!socketdata.player.id)return;
		        if(!socketdata.room.game || !socketdata.room.game.stat) return;
		        if(Date.now() - app.doLastTime < app.doUpdateTimeOut ) return;
				app.doLastTime = Date.now();

		        var data = {id:socketdata.player.id, gyrodata:{x:event.alpha, y:event.beta, z:event.gamma, t:Date.now()}};
		        if(data.gyrodata.x>=0&&data.gyrodata.x<=180) data.gyrodata.x *= -1;
		        else data.gyrodata.x = 360 - data.gyrodata.x;

		        updatePlayer(data);
		        app.updateGame();
		        g = data.gyrodata;
		        //$('.log').html(sprintf('[%.0f,%.0f,%.0f,%s]', g.x,g.y,g.z,g.t));
		        //$('.log').html(sprintf('%s,now=%s,last=%s,timeout=%s', (Date.now() - app.doLastTime < app.doUpdateTimeOut,Date.now()),app.doLastTime,app.doUpdateTimeOut));
	    	}finally{

	    	}
	    }

    	this.updateRoom=function(){
    		$('.contRoom .roomProfile').html(sprintf('room.id=%s, room.stat=%s', socketdata.room.id, socketdata.room.stat));
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
    		//


    		$('.contGame .roomProfile').html(sprintf('room.id=%s, room.stat=%s', socketdata.room.id, socketdata.room.stat));
    		$('.contGame .gameProfile').html(sprintf('game.stat=%s, game.startTime=%s', socketdata.room.game.stat, socketdata.room.game.startTime));
    		if(socketdata.player.role == 'viewer') {
	    		$('.contGame .playerProfiles ul').empty();
	    		for(key in socketdata.room.players) {
	    			player = socketdata.room.players[key];
	    			g = player.gyrodata;
	    			if(player.role == 'controller') {
	    				$('.contGame .playerProfiles ul').append(
    						$('<li class="label playerProfile"></li>').html(
    							sprintf('id=%s, name=%s, color=%s, avatarId=%s, role=%s, gyrodata=%s, life=%s, score=%s, isHost=%s', 
    							player.id, player.name, player.color, player.avatarId, player.role, (g?sprintf('[%.0f,%.0f,%.0f,%s]',g.x,g.y,g.z,g.t):""), player.life, player.score, player.isHost)));



	    				//if(g)$('.contGame .playerBall').css('left', Math.round(g.x)).css('top', Math.round(-g.y));
	    			}
	    		}
    		}else if(socketdata.player.role == 'controller') {
    			player = socketdata.player;
    			g = player.gyrodata;
    			$('.contGame .playerProfile').html(
    				sprintf('name=%s, color=%s, avatarId=%s, gyrodata=%s, life=%s, score=%s', 
    						player.name, player.color, player.avatarId, (g?sprintf('[%.0f,%.0f,%.0f,%s]',g.x,g.y,g.z,g.t):""), player.life, player.score));
    		}
    	}
    	this.playanim=function(s){
    		console.log('playanim',s)
    		if(s=='confirmedGameStart'){

    			var countdown = 5;
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

    	this.lastTime = 0;
    	this.deltaTime = 0;
    	this.animate = function() {
    		if(app.lastTime == 0) { app.deltaTime = 0; app.lastTime = Date.now() / 1000.0; }
    		else {app.deltaTime = Date.now() - app.lastTime; app.lastTime = Date.now() / 1000.0; }

    		//app.updatePlayerBalls();

    		window.requestAnimationFrame(app.animate); 
    	}



    	this.updatePlayerBalls = function(){
    		if(socketdata.player && socketdata.player.gyrodata) {
    			pb = $('playerBall');

    			left = pb.position().left;
    			top = pb.position().top;

    			left = lerp(lerp, socketdata.player.gyrodata.x, app.deltaTime * 20);
    			top = lerp(top, socketdata.player.gyrodata.y, app.deltaTime * 20);
    			$('.playerBall').css({'left':left, 'top':top});
    		}
    	}
    }
    	
})();
    
    var app = new App();
    


	var socket = io.connect('http://10.60.8.23:8080');
	socket.on('connectClient', function (data){
		var n = 'connectClient';
		console.log(n, data);
		
		syncdata(socketdata.player, data.player);

		if(!isMobile.any()) {
			socketdata.player.role = 'viewer';
			joinRoom();
		}else{
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
		console.log(n, data);

		var ind = getRoomPlayerIndById(data.player.id);
		console.log(socketdata.room.players);
		if(ind>=0) socketdata.room.players.splice(ind, 1);
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
		console.log(n, data);
		if(data.player.id == socketdata.player.id) {
			//response from self joinRoom
			$('.contJoinRoom input').prop('disabled', false);
			$('.contJoinRoom .label').html(data.e ? data.e : '');
			if(data.e) return;
			syncdata(socketdata.room, data.room);
			syncplayer_from_players(data.room.players);
			app.setStat('room');
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
		console.log(n, data);
		syncdata(socketdata.room, data.room);
		app.updateRoom();
		app.updateGame();
	});
	/////////////////////////////
	function updatePlayer(data){
		var n = 'f:updatePlayer';
		console.log(n);
		syncdata(socketdata.player, data);
		socket.emit('updatePlayer', {player:data});
		app.updateRoom();
		app.updateGame();
	}

	socket.on('updatePlayer', function (data){
		var n = 'updatePlayer';
		//console.log(n, data);
		if(socketdata.player.id==data.player.id) syncdata(socketdata.player, data.player);
		else syncplayers_from_player(data.player);
		app.updateRoom();
		app.updateGame();
	});
	/////////////////////////////
	function updateGame(data){
		var n = 'f:updateGame';
		console.log(n);
		socket.emit('updateGame', {game:data});
	}

	socket.on('updateGame', function (data){
		var n = 'updateGame';
		console.log(n, data);
		syncdata(socketdata.room.game, data.game);
		
		if(data.game.stat == 'init') {

		}else if(data.game.stat == 'started') {
			app.setStat('game');
		}
		app.updateGame();
	});

	////////////////////////////


	app.setStat('init');
});