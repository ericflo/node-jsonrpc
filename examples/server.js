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

/* By returning a promise, we can delay our response indefinitely, leaving the
   request hanging until the promise emits success. */
var delayed = {
    echo: function(data, delay) {
        var promise = new process.Promise();
        setTimeout(function() {
            promise.emitSuccess(data);
        }, delay);
        return promise;
    },
    
    add: function(first, second, delay) {
        var promise = new process.Promise();
        setTimeout(function() {
            promise.emitSuccess(first + second);
        }, delay);
        return promise;
    }
}

rpc.exposeModule('delayed', delayed);