var express = require("express");
var Handler = require('./handler.js');
var services = [];
var handlers = {};
var adminAuth;

var appHandler,
	appOptions;


function emptyMiddleware(err, req, res, next) {
	next();
}

exports.init = function(app, options) {
	appHandler = app;
	appOptions = options || {};
	appOptions.admin_base = appOptions.admin_base || '/admin';
	adminAuth = appOptions.admin_auth || appOptions.auth || emptyMiddleware;
};

//CROSS middleware
exports.allowCrossDomain = function(req, res, next) {
	var oneof = false;
	if (req.headers.origin) {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		oneof = true;
	}
	if (req.headers['access-control-request-method']) {
		res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
		oneof = true;
	}
	if (req.headers['access-control-request-headers']) {
		res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
		oneof = true;
	}
	if (oneof) {
		res.header('Access-Control-Max-Age', 60 * 60 * 24 * 365);
	}

	res.header('Access-Control-Expose-Headers', 'Restize-Meta');

	// intercept OPTIONS method
	if (oneof && req.method == 'OPTIONS') {
		res.sendStatus(200);
	} else {
		next();
	}
};


exports.pre = function(path, method, callback) {
	return handlers[path] && handlers[path].pre(method, callback);
};

exports.post = function(path, method, callback) {
	return handlers[path] && handlers[path].post(method, callback);
};

exports.aggregate = function(req, res, options, callback) {
	handler.aggregate(req, res, options, callback);
};

exports.register = function(path, options, callback) {
	var model = options.model;
	var pathWithId;

	if (!appHandler) {
		console.log("App is NOT initialized");
		return;
	}

	if (!model) {
		console.log("Invalid Model");
		return;
	}

	var modelName = model.name.toLowerCase();
	options.path = path || '/' + modelName;

	var handler = new Handler(model, options, appOptions);
	//pathWithId = new RegExp('^'+options.path + '/' + handler.getIdValidator()+'$');
	pathWithId = options.path + '/:id([0-9a-fA-F]{24})';


	// Restize URLs
	appHandler.get(pathWithId, handler.getMiddlewares('read'));
	appHandler.get(options.path, handler.getMiddlewares('list'));
	appHandler.get(options.path + '/group', handler.getMiddlewares('aggregate'));
	appHandler.get(options.path + '/schema', handler.schema());
	appHandler.post(options.path, handler.getMiddlewares('create'));
	appHandler.put(pathWithId, handler.getMiddlewares('update'));
	appHandler.delete(pathWithId, handler.getMiddlewares('destroy'));


	handlers[options.path] = handler;


	console.log('REGISTERING ' + options.path);

	//calls schema function
	if (typeof callback === "function") {
		handler.schema(callback);
	}

	return options.path + "/schema";
};

