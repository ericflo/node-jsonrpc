var sys = require('sys');
var rpc = require('../src/jsonrpc');

var client = rpc.getClient(8000, 'localhost');

client.call('add', [1, 2], function(result) {
    sys.puts('  1 + 2 = ' + result);
});

client.call('multiply', [199, 2], function(result) {
    sys.puts('199 * 2 = ' + result);
});

// Accessing modules is as simple as dot-prefixing.
client.call('math.power', [3, 3], function(result) {
    sys.puts('  3 ^ 3 = ' + result);
});

// Call simply returns a promise, so we can add callbacks or errbacks at will.
var promise = client.call('add', [1, 1]);
promise.addCallback(function(result) {
    sys.puts('  1 + 1 = ' + result + ', dummy!');
});

/* These calls should each take 1.5 seconds to complete. */
client.call('delayed.add', [1, 1, 1500], function(result) {
    sys.puts(result);
});

client.call('delayed.echo', ['Echo.', 1500], function(result) {
    sys.puts(result);
});