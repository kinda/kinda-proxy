"use strict";

var http = require('http');
var nodeURL = require('url');
var _ = require('lodash');
var httpProxy = require('http-proxy');
var KindaObject = require('kinda-object');
var util = require('kinda-util').create();
var config = require('kinda-config').get('kinda-proxy');

var proxy = httpProxy.createProxyServer({});

var KindaProxy = KindaObject.extend('KindaProxy', function() {
  this.setCreator(function() {
    this.routes = [];
    this.listeningPorts = [];
    _.forEach(config.routes, function(route) {
      var parsedFrom = nodeURL.parse(route.from);
      var hostname = parsedFrom.hostname;
      if (!hostname)
        throw new Error("hostname is missing in '" + route.from + "'");
      var port = parseInt(parsedFrom.port) || 80;
      this.routes.push({
        from: { hostname: hostname, port: port },
        to: route.to
      });
      if (this.listeningPorts.indexOf(port) === -1)
        this.listeningPorts.push(port);
    }, this);
  });

  this.start = function() {
    _.forEach(this.listeningPorts, function(port) {
      var server = http.createServer(this.handler.bind(this));
      server.on('listening', function() {
        util.log('Listening on port ' + port);
      });
      server.on('error', function(err) {
        util.error(err);
      });
      server.listen(port);
    }, this);
  };

  this.handler = function(req, res) {
    var hostname = req.headers.host || '';
    var index = hostname.indexOf(':');
    if (index !== -1) hostname = hostname.substr(0, index);
    var port = req.socket.localPort;
    var route = _.find(this.routes, function(route) {
      if (route.from.hostname === hostname && route.from.port === port)
        return true;
    });
    if (!route) {
      util.error("route '" + hostname + ':' + port + "' is undefined");
      res.statusCode = 404
      res.end('Not Found');
      return;
    }
    proxy.web(req, res, { target: route.to }, function(err) {
      util.error(err);
      res.statusCode = 500
      res.end('Internal Error');
    });
  };
});

module.exports = KindaProxy;
