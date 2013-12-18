module.exports = {
    models:{},
    id:1,
    crud:{
        create: function(req, res, next) {
            var model = req.data;
            if (!req.data.id) req.data.id = id++;
            model.id = id++;
            models[model.id] = model;
            res.send(model);
        },

        read: function(req, res, next) {
            res.send(models[req.data.id]);
        },

        action: function(req, res, next) {
            res.send(req.data);
        },

        list: function(req, res, next) {
            var values = [];
            for (var id in models) values.push(models[id]);
            res.send(values);
        },

        update: function(req, res, next) {
            models[req.data.id] = req.data;
            res.send(req.data);
        },

        delete: function(req, res, next) {
            delete models[req.data.id];
            res.send(req.data);
        }
    },
    delegate: function(req, res, next) {
        if (!crud[req.action]) return next(new Error('Unsuppored action: ' + req.action));
        crud[req.action](req, res, next);
    }
};

