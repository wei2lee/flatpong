
var util = require('util');
var apputil = require('./apputil');
var printf = require('printf');

var roomPool = apputil.generateRoomNamePool(10000);

var io = require('socket.io').listen(37001);
//var io = require('socket.io').listen(37001, '192.168.145.170');

var Config = function(){
//player
this.expireTimeoutDuration = 1000 * 15 * 60;
this.idleTimeoutDuration = 1000 * 5 * 60;
this.toall_playeronlyprops = ['name', 'avatarId', 'color', 'life', 'score'];
this.toviewer_playeronlyprops = ['gyrodata'];

//game
this.gameonlyprops = ['stat'];

//room
this.roomonlyprops = ['stat'];
this.minController = 1;
this.maxController = 4;
this.confirmedGameStartWait = 5000; //ms


};
var cfg = new Config();


io.enable('browser client minification');  // send minified client
io.enable('browser client etag');          // apply etag caching logic based on version number
io.enable('browser client gzip');          // gzip the file
io.set('log level', 1);                    // reduce logging
// enable all transports (optional if you want flashsocket support, please note that some hosting
// providers do not allow you to create servers that listen on a port different than 80 or their
// default port)
io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
]);
//*/

console.log('config=',cfg);
io.sockets.on('connection', function (socket) {
    /*
    if(cfg.expireTimeout>0) socket.data.expireTimeout = setTimeout(cfg.expireTimeoutDuration, function(){
        socket.disconnect(true);
    });//*/
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

            //console.log(prop, nv[prop], onlyprops.indexOf(prop)<0, prop == 'id', diff);
        }
        return diff;
    }
    function syncdata(ov, nv, onlyprops, m){
        for(prop in nv) {
            if(onlyprops) {
                if(onlyprops.indexOf(prop)<0) continue;
                if(prop == 'id') continue;
                ov[prop] = nv[prop];
            }else {
                if(prop == 'id') continue;
                ov[prop] = nv[prop];
            }
        }
    }
    function getViewerSocket(){
        for(key in socket.data.room.players) {
            if(socket.data.room.players[key].role == 'viewer') {
                return io.sockets.sockets[socket.data.room.players[key].id];
            }
        }
        return null;
    }
    function getHostSocket(){
        for(key in socket.data.room.players) {
            if(socket.data.room.players[key].role == 'controller' && socket.data.room.players[key].isHost) {
                return io.sockets.sockets[socket.data.room.players[key].id];
            }
        }
        return null;
    }
    function getPlayerSocket(ind){
        var i = 0;
        for(key in socket.data.room.players) {
            if(socket.data.room.players[key].role == 'controller') {
                if(i == ind)
                    return io.sockets.sockets[socket.data.room.players[key].id];
                i++;
            }
        }
        return null;
    }
    console.log('////////////////////////');
    console.log('socket.id=',socket.id);
    console.log('rooms=',io.sockets.manager.rooms);
    console.log('roomPool.length=',roomPool.length);


    //socket.data : connection session variable
    //socket.room : room session variable
    //socket.room.game : game session variable
    socket.data = {};
    //room.stat=[init, started, confirmedGameStart, ended]
    //room.game.stat=[init, started, ended];
    socket.data.room = {id:null, stat:'init', viewerId:null, disconnectWithoutNotify:false, players:[], game:{id:null, stat:'init', startTime:null, endTime:null}};

    //socket.data.player.role=[controller, viewer]
    socket.data.player = {id:null, startTime:null, role:null, name:null, color:'#ff5555', avatarId:0, life:null, score:null, isHost:null, confirmedGameStart:false, gyrodata:null};

    function syncplayer(player){
        if(player.id==socket.data.player.id){
            syncdata(socket.data.player,player);
        }
        for(key in socket.data.room.players) {
            if(socket.data.room.players[key].id == player.id) {
                syncdata(socket.data.room.players[key],player);
                break;
            }
        }
    }
    function indexOfPlayer(id){
        var ind = 0;
        if(!socket.data.room.players) return -1;
        for(key in socket.data.room.players) {
            if(socket.data.room.players[key].id == id){
                return ind; 
            }
            ind++;
        }
        return -1;
    }
    function removePlayer(id){
        var ind = indexOfPlayer(id);
        if(ind>=0) socket.data.room.players.splice(ind, 1);
    }
   
    socket.data.player.id = socket.id;
    socket.data.player.startTime = Date.now();
    socket.emit('connectClient', {player:{id:socket.id, startTime:Date.now()}});

    //room action
    socket.on('joinRoom', function (data){
        var n = 'joinRoom';
        var rmid, rcid, rcids, rcskt, rcsktid;
        var rm;
        try {

        if(!data.player || !data.player.role || (data.player.role != 'controller' && data.player.role != 'viewer')) { throw 'invalid data.player'; }
        if(!data.room) { throw 'invalid data.room'; }


        if(data.player.role == 'viewer' && !data.room.id) {
            socket.data.player.role = 'viewer';
            rm = socket.data.room;
            socket.data.room.id = roomPool.shift();
            socket.data.room.players=[socket.data.player];
            socket.data.room.viewerId = socket.id;
            socket.join(socket.data.room.id);
            socket.emit('joinRoom', {room:rm, player:{id:socket.id}});
            socket.emit('updatePlayer', {player:socket.data.player});
        }else if(data.player.role == 'viewer' && data.room.id) {
            if(socket.data.room.id) throw 'already joined room';

            rcskts = io.sockets.clients(data.room.id);
            var isvalidroom = true;
            for(key in rcskts) {
                rcskt = rcskts[key];
                rm = rcskt.data.room;
                if(rcskt.data.room.viewerId){ isvalidroom = false; break; }
            }
            if(!isvalidroom) throw 'viewer already existed';

            socket.data.room = rm;
            socket.data.room.viewerId = socket.id;
            socket.data.player.name = 'viewer';
            socket.data.player.role = 'viewer';
            socket.data.room.players.push(socket.data.player);
            socket.join(socket.data.room.id);

            io.sockets.in(socket.data.room.id).emit('joinRoom', {room:rm, player:{id:socket.id}});
            socket.emit('updatePlayer', {player:{name:socket.data.player.name, role:socket.data.player.role}});

        }else if(data.player.role == 'controller') {
            if(!data.room.id) throw 'room.id is emtpy';
            if(socket.data.room.id) throw 'already joined room';
            rcskts = io.sockets.clients(data.room.id);
            if(!rcskts.length) throw 'room.id not existed';
            var ctrlrcnt = 0;

            for(key in rcskts) {
                rcskt = rcskts[key];
                rm = rcskt.data.room;
                ctrlrcnt += rcskt.data.player.role == 'controller' ? 1 : 0;
                if(ctrlrcnt >= cfg.maxController) throw 'max controller is reached';
            }
            socket.data.room = rm;
            if(ctrlrcnt == 0) socket.data.player.isHost = true;
            socket.data.player.role = 'controller';
            socket.data.player.name = 'Player'+(ctrlrcnt+1);
            socket.data.room.players.push(socket.data.player);
            socket.join(socket.data.room.id);
            
            io.sockets.in(socket.data.room.id).emit('joinRoom', {room:rm, player:{id:socket.id}});

            socket.emit('updatePlayer', {player:socket.data.player}); 
        }else{
            throw 'invalid joinRoom';
        }

        } catch (err) {
            console.log(n, err, data);

            socket.emit('error', {n:n, e:err, d:data}); 
            socket.emit('joinRoom', {e:err, player:{id:socket.id}});
        }
    });
    
    function getLowestStartTimeController(players){
        var ret = null;
        for(key in players){
            if(players[key].role != 'controller') continue;
            if(ret === null) ret = players[key];
            else if(players[key].startTime < ret.startTime) ret = players[key];
        }
        return ret;
    }

    socket.on('disconnect', function (){
        var n = 'disconnect';
        var rmid, rcid, rcids, rcskt, rcsktid;
        var rm;
        try {

        if(!socket.data.room.id) return;

        if(socket.data.room.viewerId == socket.id) {
            for(key in socket.data.room.players) {
                var player = socket.data.room.players[key];
                if(player.id != socket.id) {
                    io.sockets.sockets[player.id].leave(socket.data.room.id);
                    io.sockets.sockets[player.id].disconnect(true);
                }
            }

            socket.data.room.viewerId=null;
            socket.data.room.disconnectWithoutNotify = true;
            socket.data.room.players=[];
            roomPool.push(socket.data.room.id);

            return;
        }

        if(!socket.data.room.disconnectWithoutNotify) {
            removePlayer(socket.id);
            socket.broadcast.to(socket.data.room.id).emit('disconnectRoom', {player:{id:socket.id, role:socket.data.player.role, isHost:socket.data.player.isHost }});

            //host controller is disconnected, select next host
            if(socket.data.player.isHost) {
                var nextHostPlayer = getLowestStartTimeController(socket.data.room.players);
                if(!nextHostPlayer) { 
                    //disconnected controller is host and theres no other controller
                    //not necessary to assign next host
                }else{
                    nextHostPlayer.isHost=true;
                    socket.broadcast.to(socket.data.room.id).emit('updatePlayer', {player:{id:nextHostPlayer.id, isHost:true}});            
                }
            }
            socket.leave(socket.data.room.id);
            if(io.sockets.clients(socket.data.room.id).length == 0) {
                roomPool.push(socket.data.room.id);
            }
        }

        }catch(err){
            console.log(n, socket.id, err);
        }
    });

    socket.on('updateRoom', function (data){
        var n = 'updateRoom';
        try {
            if(!data.room) throw 'invalid room';
            if(socket.player.role != 'viewer' && !socket.player.isHost) throw 'player is not viewer and is not Host';
            //socket.braodcast.to(socket.data.room.id).emit('updateRoom', data);
            io.sockets.in(socket.data.room.id).emit('updateRoom',data);
        } catch(err) {
            console.log(n, err, data);
            socket.emit('error', {n:n, e:err}); 
        }
    });

    socket.on('updatePlayer', function (data) {
        var n = 'updatePlayer';
        try {
        if(!data.player) throw 'invalid data';
        if(!socket.data.room.id) return;
        if(socket.data.player.role == 'controller') {
            if(data.player.confirmedGameStart === true && socket.data.room.stat != 'init') throw 'confirm game start while room is not init';
            if(data.player.confirmedGameStart === true && socket.data.player.confirmedGameStart) throw 'player is already confirmed';

            var confirmcnt = 0;
            var ctrlrcnt = 0;
            if(data.player.confirmedGameStart === true){
                socket.data.player.confirmedGameStart = true;
                socket.broadcast.to(socket.data.room.id).emit('updatePlayer', {player:{id:socket.id, confirmedGameStart:true}});
                for(key in socket.data.room.players) {
                    var player = socket.data.room.players[key];
                    ctrlrcnt += player.role == 'controller' ? 1 : 0;
                    confirmcnt += player.confirmedGameStart ? 1 : 0;
                }
                if(ctrlrcnt > 0 && confirmcnt == ctrlrcnt) {
                    socket.data.room.stat = 'confirmedGameStart';
                    io.sockets.in(socket.data.room.id).emit('updateRoom', {room:{id:socket.data.room.id, stat:'confirmedGameStart'}});
                }
            }
            var toalldata = diffdata(socket.data.player, data.player, cfg.toall_playeronlyprops); 
            if(toalldata) {
                toalldata.id = socket.id;
                syncplayer(toalldata);
                socket.broadcast.to(socket.data.room.id).emit('updatePlayer', {player:toalldata});
            }
            if(socket.data.room.viewerId){
                var toviewerdata = diffdata(socket.data.player, data.player, cfg.toviewer_playeronlyprops);
                if(toviewerdata){
                    toviewerdata.id = socket.id;
                    syncplayer(toviewerdata);
                    io.sockets.sockets[socket.data.room.viewerId].emit('updatePlayer', {player:toviewerdata});
                }
            }
            

        }else if(socket.data.player.role == 'viewer') {
            if(!data.player.id) throw 'viewer update player with no id';
            for(key in socket.data.room.players) {
                if(socket.data.room.players[key].id == data.player.id) {
                    syncplayer(socket.data.room.players[key], data);
                    socket.broadcast.to(socket.data.room.id).emit('updatePlayer', data);
                    break;
                }
            }
        }else{
            throw 'invalid player role';
        }


        }catch(err){
            console.log(n, err, data);
            socket.emit('error', {n:n, e:err}); 
        }
    }); 
    //end room action

    //game action
    socket.on('updateGame', function (data) {
        var n = 'updateGame';
        try{
        if(!data.game) throw 'invalid game data';
        if(socket.data.player.role == 'viewer' || socket.data.player.isHost) {
            if(data.game.stat == 'ended') {
                data.game.endTime = socket.data.room.game.endTime = Date.now();
            }else if(data.game.stat == 'ready'){
                data.game.stat = socket.data.room.game.stat = 'ready';
                data.game.endTime = socket.data.room.game.endTime = null;
                data.game.startTime = socket.data.room.game.startTime = null;
            }
            //socket.broadcast.to(socket.data.room.id).emit('updateGame', data);
            io.sockets.in(socket.data.room.id).emit('updateGame',data);

            setTimeout(function(){
                socket.data.room.game.stat = 'started';
                socket.data.room.game.startTime = Date.now();

                io.sockets.in(socket.data.room.id).emit('updateGame', {game:{stat:'started', startTime:socket.data.room.game.startTime}});
            }, cfg.confirmedGameStartWait);
        }else {
            throw 'invalid data';
        }

        }catch(err){
            console.log(n, err, data);
            socket.emit('error', {n:n, e:err});    
        }
    });


    //end game action



});


