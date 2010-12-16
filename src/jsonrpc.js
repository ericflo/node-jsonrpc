var sys = require('sys');
var http = require('http');

var functions = {};

var METHOD_NOT_ALLOWED = "Method Not Allowed\n";
var INVALID_REQUEST = "Invalid Request\n";

var JSONRPCClient = function(port, host, user, password) {
    this.port = port;
    this.host = host;
    this.user = user;
    this.password = password;
    
    this.call = function(method, params, callback, errback, path) {
        var client = http.createClient(port, host);
        
        // First we encode the request into JSON
        var requestJSON = JSON.stringify({
            'id': '' + (new Date()).getTime(),
            'method': method,
            'params': params
        });
        
        var headers = {};

        if (user && password) {
            var buff = new Buffer(this.user + ":" + this.password).toString('base64');
            var auth = 'Basic ' + buff;
            headers['Authorization'] = auth;
        }

        // Then we build some basic headers.
        headers['Host'] = host;
        headers['Content-Length'] = requestJSON.length;

        // Now we'll make a request to the server
        var request = client.request('POST', path || '/', headers);
        request.write(requestJSON);
        request.on('response', function(response) {
            // We need to buffer the response chunks in a nonblocking way.
            var buffer = '';
            response.on('data', function(chunk) {
                buffer = buffer + chunk;
            });
            // When all the responses are finished, we decode the JSON and
            // depending on whether it's got a result or an error, we call
            // emitSuccess or emitError on the promise.
            response.on('end', function() {
                var decoded = JSON.parse(buffer);
                if(decoded.hasOwnProperty('result')) {
                    if (callback)
                      callback(decoded.result);
                }
                else {
                    if (errback)
                      errback(decoded.error);
                }
            });
        });
    };
}

var JSONRPC = {
    
    functions: functions,
    
    exposeModule: function(mod, object) {
        var funcs = [];
        for(var funcName in object) {
            var funcObj = object[funcName];
            if(typeof(funcObj) == 'function') {
                functions[mod + '.' + funcName] = funcObj;
                funcs.push(funcName);
            }
        }
        JSONRPC.trace('***', 'exposing module: ' + mod + ' [funs: ' + funcs.join(', ') + ']');
        return object;
    },
    
    expose: function(name, func) {
        JSONRPC.trace('***', 'exposing: ' + name);
        functions[name] = func;
    },
    
    trace: function(direction, message) {
        sys.puts('   ' + direction + '   ' + message);
    },
    
    listen: function(port, host) {
        JSONRPC.server.listen(port, host);
        JSONRPC.trace('***', 'Server listening on http://' + (host || '127.0.0.1') + ':' + port + '/');
    },
    
    handleInvalidRequest: function(req, res) {
        res.writeHead(400, {'Content-Type': 'text/plain',
                            'Content-Length': INVALID_REQUEST.length});
        res.write(INVALID_REQUEST);
        res.finish();
    },
    
    handlePOST: function(req, res) {
        var buffer = '';
        var promise = new process.Promise();
        promise.addCallback(function(buf) {

            var decoded = JSON.parse(buf);
            
            // Check for the required fields, and if they aren't there, then
            // dispatch to the handleInvalidRequest function.
            if(!(decoded.method && decoded.params && decoded.id)) {
                return JSONRPC.handleInvalidRequest(req, res);
            }
            if(!JSONRPC.functions.hasOwnProperty(decoded.method)) {
                return JSONRPC.handleInvalidRequest(req, res);
            }
            
            // Build our success handler
            var onSuccess = function(funcResp) {
                JSONRPC.trace('-->', 'response (id ' + decoded.id + '): ' + JSON.stringify(funcResp));
                var encoded = JSON.stringify({
                    'result': funcResp,
                    'error': null,
                    'id': decoded.id
                });
                res.writeHead(200, {'Content-Type': 'application/json',
                                    'Content-Length': encoded.length});
                res.write(encoded);
                res.finish();
            };
            
            // Build our failure handler (note that error must not be null)
            var onFailure = function(failure) {
                JSONRPC.trace('-->', 'failure: ' + JSON.stringify(failure));
                var encoded = JSON.stringify({
                    'result': null,
                    'error': failure || 'Unspecified Failure',
                    'id': decoded.id
                });
                res.writeHead(200, {'Content-Type': 'application/json',
                                    'Content-Length': encoded.length});
                res.write(encoded);
                res.finish();
            };
            
            JSONRPC.trace('<--', 'request (id ' + decoded.id + '): ' + decoded.method + '(' + decoded.params.join(', ') + ')');
            
            // Try to call the method, but intercept errors and call our
            // onFailure handler.
            var method = JSONRPC.functions[decoded.method];
            var resp = null;
            try {
                resp = method.apply(null, decoded.params);
            }
            catch(err) {
                return onFailure(err);
            }
            
            // If it's a promise, we should add callbacks and errbacks,
            // but if it's not, we can just go ahead and call the callback.
            if(resp instanceof process.Promise) {
                resp.addCallback(onSuccess);
                resp.addErrback(onFailure);
            }
            else {
                onSuccess(resp);
            }
        });
        req.addListener('body', function(chunk) {
            buffer = buffer + chunk;
        });
        req.addListener('complete', function() {
            promise.emitSuccess(buffer);
        });
    },
    
    handleNonPOST: function(req, res) {
        res.writeHead(405, {'Content-Type': 'text/plain',
                            'Content-Length': METHOD_NOT_ALLOWED.length,
                            'Allow': 'POST'});
        res.write(METHOD_NOT_ALLOWED);
        res.finish();
    },
    
    handleRequest: function(req, res) {
        JSONRPC.trace('<--', 'accepted request');
        if(req.method === 'POST') {
            JSONRPC.handlePOST(req, res);
        }
        else {
            JSONRPC.handleNonPOST(req, res);
        }
    },
    
    server: http.createServer(function(req, res) {
        // TODO: Get rid of this extraneous extra function call.
        JSONRPC.handleRequest(req, res);
    }),
    
    getClient: function(port, host, user, password) {
        return new JSONRPCClient(port, host, user, password);
    }
};

module.exports = JSONRPC;
