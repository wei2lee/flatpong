
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

this.def_socketdata_room_game = {id:null, stat:'init', startTime:null, endTime:null, team1score:0, team2score:0};
this.def_socketdata_room = {id:null, stat:'init', disconnectWithoutNotify:false, players:[], game:this.def_socketdata_room_game};
this.def_socketdata_player = {id:null, startTime:null, role:null, name:null, color:'#ff5555', avatarId:0, life:null, score:null, isHost:null, confirmed:false, gyrodata:null};


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
                if(prop == 'id') continue;
                ov[prop] = nv[prop];
            }else {
                if(prop == 'id') continue;
                ov[prop] = nv[prop];
            }
        }
    }
    console.log('////////////////////////');
    console.log('socket.id=',socket.id);
    console.log('rooms=',io.sockets.manager.rooms);
    console.log('roomPool.length=',roomPool.length);
    //console.log('roomPool=',roomPool);


    //socket.data : connection session variable
    //socket.room : room session variable
    //socket.room.game : game session variable
    socket.data = {};
    //room.stat=[init, started, ended]
    //room.game.stat=[init, confirmed, ready, started, ended];
    socket.data.room = clone(cfg.def_socketdata_room);

    //socket.data.player.role=[controller, viewer]
    socket.data.player = clone(cfg.def_socketdata_player);

    function clone(obj){
        return JSON.parse(JSON.stringify(obj));
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
    function getControllerSocket(ind){
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

    function syncplayer(player, onlyprops){
        if(player.id==socket.data.player.id){
            syncdata(socket.data.player,player,onlyprops);
        }
        for(key in socket.data.room.players) {
            if(socket.data.room.players[key].id == player.id) {
                syncdata(socket.data.room.players[key],player,onlyprops);
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
    function indexOfController(id){
        var ind = 0;
        if(!socket.data.room.players) return -1;
        for(key in socket.data.room.players) {
            if(socket.data.room.players[key].role == 'controller') {
                if(socket.data.room.players[key].id == id)
                    return ind;
                ind++;
            }
        }
        return -1;
    }
    function removePlayer(id){
        var ind = indexOfPlayer(id);
        if(ind>=0) socket.data.room.players.splice(ind, 1);
    }
    function controllers(){
        var ret = [];
        for(key in socket.data.room.players){
            if(socket.data.room.players[key].role=='controller'){
                ret.push(socket.data.room.players[key]);
            }
        }
        return ret;
    }

   
    socket.data.player=clone(cfg.def_socketdata_player);
    socket.data.player.id = socket.id;
    socket.data.player.startTime = Date.now();

    //console.log(socket.data.player);
    socket.emit('onConnected', {player:{id:socket.id, startTime:Date.now()}});

    socket.on('playerAction', function (data){
        var n = 'playerAction';
        console.log(n,data);
        var rmid, rcid, rcids, rcskt, rcsktid;
        var rm;
        try{
            var action = data.action;
            if(action == 'join') {
                if(!data.player || !data.player.role || (data.player.role != 'controller' && data.player.role != 'viewer')) { throw 'invalid data.player'; }
                if(!data.room) { throw 'invalid data.room'; }

                if(data.player.role == 'viewer') {
                    if(roomPool.length==0) throw 'no room is available';
                    
                    if(socket.data.room.id) {
                        for(key in socket.data.room.players) {
                            var player = socket.data.room.players[key];
                            if(player.id != socket.id) {
                                io.sockets.sockets[player.id].leave(socket.data.room.id);
                                io.sockets.sockets[player.id].disconnect(true);
                            }
                        }
                        socket.data.room.disconnectWithoutNotify = true;
                        socket.data.room.players=[];
                        roomPool.push(socket.data.room.id);
                        socket.leave(socket.data.room.id);
                    }//*/

                    socket.data.player.role = 'viewer';
                    socket.data.room=clone(cfg.def_socketdata_room);
                    socket.data.room.id = roomPool.shift();
                    socket.data.room.players=[socket.data.player];
                    rm = socket.data.room;
                    socket.join(socket.data.room.id);
                    socket.emit('onPlayerJoined', {room:rm, player:socket.data.player});
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
                    

                    io.sockets.in(socket.data.room.id).emit('onPlayerJoined', {room:rm, player:socket.data.player});
                }else{
                    throw 'invalid playerActionJoin';
                }
            }else{
                if(socket.data.player.role != 'controller') throw 'player.role is not controller';
                vs=getViewerSocket(); if(vs)vs.emit('onPlayerAction',data);
            }
        }catch(err){
            //console.log(n, {action:data.action, e:err});
            //socket.emit(n, {action:data.action, e:err});
            socket.emit('error', {n:n, action:data.action, e:err})
        }
    });

    socket.on('viewerAction', function (data){
        var n = 'viewerAction';
        console.log(n,data);
        var rmid, rcid, rcids, rcskt, rcsktid;
        var rm;
        try{
            if(data.action=='join'){
                if(data.player.role != 'viewer') throw 'data.player.role is not viewer';
                if(roomPool.length==0) throw 'no room is available';

                if(socket.data.room.id) {
                    for(key in socket.data.room.players) {
                        var player = socket.data.room.players[key];
                        if(player.id != socket.id) {
                            io.sockets.sockets[player.id].leave(socket.data.room.id);
                            io.sockets.sockets[player.id].disconnect(true);
                        }
                    }
                    socket.data.room.disconnectWithoutNotify = true;
                    socket.data.room.players=[];
                    roomPool.push(socket.data.room.id);

                    socket.leave(socket.data.room.id);
                }//*/


                socket.data.player.role = 'viewer';
                socket.data.player.name = 'viewer';
                socket.data.room=clone(cfg.def_socketdata_room);
                socket.data.room.id = roomPool.shift();
                socket.data.room.players=[socket.data.player];
                rm = socket.data.room;
                socket.join(socket.data.room.id);
                socket.emit('onPlayerJoined', {room:rm, player:socket.data.player});
            }else{
                socket.broadcast.to(socket.data.room.id).emit('onViewerAction',data);
            }
        }catch(err){
            //socket.emit(n, {action:data.action, e:err});
            socket.emit('err', {n:n, action:data.action, e:err})
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
        console.log(n,socket.id,socket.data.player,socket.data.room);
        var rmid, rcid, rcids, rcskt, rcsktid;
        var rm;
        var vs = getViewerSocket();
        try {

        if(!socket.data.room.id) return;

        if(socket.data.player.role == 'viewer') {
            for(key in socket.data.room.players) {
                var player = socket.data.room.players[key];
                if(player.id != socket.id) {
                    io.sockets.sockets[player.id].leave(socket.data.room.id);
                    io.sockets.sockets[player.id].disconnect(true);
                }
            }
            socket.data.room.disconnectWithoutNotify = true;
            socket.data.room.players=[];
            roomPool.push(socket.data.room.id);
            return;
        }

        if(!socket.data.room.disconnectWithoutNotify) {
            removePlayer(socket.id);
            socket.broadcast.to(socket.data.room.id).emit('onPlayerLeave', {player:{id:socket.id, role:socket.data.player.role, isHost:socket.data.player.isHost}});

            //host controller is disconnected, select next host
            if(socket.data.player.isHost) {
                var nextHostPlayer = getLowestStartTimeController(socket.data.room.players);
                if(!nextHostPlayer) { 
                    //disconnected controller is host and theres no other controller
                    //not necessary to assign next host
                }else{
                    nextHostPlayer.isHost=true;
                    socket.broadcast.to(socket.data.room.id).emit('onAnyPlayerModified', {player:{id:nextHostPlayer.id, isHost:true}});            
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

    socket.on('modifyRoom', function (data){
        var n = 'modifyRoom';
        try {
            if(!data.room) throw 'invalid room';
            if(socket.player.role != 'viewer' && !socket.player.isHost) throw 'player.role is not viewer and player is not Host';

            syncdata(socket.data.room,data.room);

            io.sockets.in(socket.data.room.id).emit('onRoomModified',data);
        } catch(err) {
            //socket.emit(n, {e:err});
            socket.emit('error', {n:n, e:err}); 
        }
    });

    socket.on('modifyGame', function (data){
        var n = 'modifyGame';
        try {
            if(!data.game) throw 'invalid game';
            if(socket.player.role != 'viewer' && !socket.player.isHost) throw 'player.role is not viewer and player is not Host';

            if(socketdata.room.game.stat!='ended' && data.game.stat=='ended') {
                socket.data.room.game.stat=data.game.stat;
                data.game.endTime = socket.data.room.game.endTime = Date.now();
                io.sockets.in(socket.data.room.id).emit('onGameModified',data);

            }else if(socketdata.room.game.stat!='ready' && data.game.stat == 'ready'){
                socket.data.room.game.stat = data.game.stat;
                data.game.endTime = socket.data.room.game.endTime = null;
                data.game.startTime = socket.data.room.game.startTime = null;
                io.sockets.in(socket.data.room.id).emit('onGameModified',data);

                setTimeout(function(){
                    socket.data.room.game.stat = 'started';
                    socket.data.room.game.startTime = Date.now();

                    io.sockets.in(socket.data.room.id).emit('onGameModified', {game:{stat:'started', startTime:socket.data.room.game.startTime}});
                }, cfg.confirmedGameStartWait);
            }else{
                throw 'invalid game.stat:' + data.game.stat + ', current game.stat:' + socket.data.room.game.stat;
            }
            
        } catch(err) {
            //socket.emit(n, {e:err});
            socket.emit('error', {n:n, e:err}); 
        }
    });

    socket.on('modifyPlayer', function (data){
        var n = 'modifyPlayer';
        try {
            if(!data.player) throw 'invalid player';
            if(socket.player.role != 'viewer' || !data.player.id) throw 'player.role is not viewer or data.player.id is empty';
            if(socket.player.id != data.player.id) 'player.id is not same as data.player.id';
            //syncplayer(data);
            //io.sockets.in(socket.data.room.id).emit('onPlayerModified',data);
            //socket.braodcast.to(socket.data.room.id).emit('onPlayerModified',data);

            if(socket.id==data.player.id) {
                var toalldata = diffdata(socket.data.player, data.player, cfg.toall_playeronlyprops); 
                if(!socket.data.player.confirm && data.player.confirm) {
                    if(toalldata)toalldata.confirm = true;
                    else toalldata={confirm:true};
                }
                if(toalldata) {
                    toalldata.id = socket.id;
                    syncplayer(toalldata);
                    socket.broadcast.to(socket.data.room.id).emit('onPlayerModified', {player:toalldata});
                }
                vs=getViewerSocket();
                if(vs){
                    var toviewerdata = diffdata(socket.data.player, data.player, cfg.toviewer_playeronlyprops);
                    if(toviewerdata){
                        toviewerdata.id = socket.id;
                        syncplayer(toviewerdata);
                        vs.emit('onPlayerModified', {player:toviewerdata});
                    }
                }
            }else if(socket.player.role=='viewer'){
                syncplayer(data);
                socket.broadcast.to(socket.data.room.id).emit('onPlayerModified', {player:toviewerdata});
            }


            if(socket.data.room.game.stat == 'init') {
                var confirmcnt=0;
                var cntrlrcnt=0;

                for(key in socket.data.room.players){
                    player=socket.data.room.players[key];
                    cntrlrcnt+=player.role=='controller'?1:0;
                    confirmcnt+=player.confirmed?1:0;
                }
                if(cntrlrcnt==confirmcnt){
                    socket.data.room.game.stat='confirmed';
                    io.sockets.sockets.in(socket.data.room.id).emit('onGameModified',{stat:socket.data.room.game.stat});
                }
            }


        } catch(err) {
            //socket.emit(n, {e:err});
            socket.emit('error', {n:n, e:err}); 
        }
    });
});


