

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
})();

function lerp(a,b,d){
    if(d>=1)d=1;
    if(d<=0)d=0;
    return a + (b - a) * d;
}

function clamp(v,a,b){
    if(v<a)return a;
    if(v>b)return b;
    return v;
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

function strValueOf(obj){
    var s='{';
    var i=0;
    for(key in obj){
        var valstr='';
        if(typeof obj[key] == 'string') valstr="'"+obj[key]+"'";
        else if(typeof obj[key] == 'number' || typeof obj[key] == 'boolean') valstr=''+obj[key];
        else valstr=''+obj[key];
        if(i==0)s+=key+':'+valstr;
        else s+=', '+key+':'+valstr;
        i++;
    }
    return s+'}';
}

