var rpc = require('../src/jsonrpc');

/* Create two simple functions */
function add(first, second) {
    return first + second;
}

function multiply(first, second) {
    return first * second;
}

/* Expose those methods */
rpc.expose('add', add);
rpc.expose('multiply', multiply);

/* We can expose entire modules easily */
var math = {
    power: function(first, second) { return Math.pow(first, second); },
    sqrt: function(num) { return Math.sqrt(num); }
}
rpc.exposeModule('math', math);

/* Listen on port 8000 */
rpc.listen(8000, 'localhost');

/* 
=====================================================================================
NOTE
=====================================================================================
Right now creating process.Promise objects inside of these callback functions
somehow causes node.js to bail with this error:

"V8 FATAL ERROR. v8::Object::SetInternalField() Writing internal field out of bounds"

Once this is fixed, or I figure out where I went wrong, I'll be able to
uncomment this code.
=====================================================================================

var delayed = {
    echo: function(data, delay) {
        var promise = process.Promise();
        setTimeout(function() {
            promise.emitSuccess(data);
        }, delay);
        return promise;
    },
    
    add: function(first, second, delay) {
        var promise = process.Promise();
        setTimeout(function() {
            promise.emitSuccess(first + second);
        }, delay);
        return first + second;
    }
}

rpc.exposeModule('delayed', delayed);
*/