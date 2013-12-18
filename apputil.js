var printf = require('printf');

module.exports = {
	generateMobilePairCodePool: function (size){
		var ret = [];
		for(var i = 0 ; i < size ; i++) {
			ret.push(printf("%04d", i));
		}
		this.shuffle(ret);
		return ret;
	},

	generateRoomNamePool: function(size) {
		var ret = [];
		for(var i = 0 ; i < size ; i++) {
			ret.push(printf("%04d", i));
		}
		this.shuffle(ret);
		return ret;
	},

	shuffle: function (o){ //v1.0 
		for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
		return o;
	}

};
