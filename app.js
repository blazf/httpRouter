// load core packages
var http = require('http');
var url = require('url');
var querystring = require('querystring');
var fs = require('fs');
// express middleware
var express = require('express');

// initialize the web server
var app = express();
app.configure(function() { 
	app.use(express.cookieParser());	
	app.use(express.session({ secret: 'tralala hopsasa' }));	
});
app.set('view engine', 'ejs');
app.enable('trust proxy');

// no parsing of incoming body, just forwarding
app.use (function(req, res, next) {
	var data='';
	req.setEncoding('utf8');
	req.on('data', function(chunk) { 
	   data += chunk;
	});
	req.on('end', function() {
		req.body = data;
		next();
	});
});

// parse settings
var settings = JSON.parse(fs.readFileSync('router.json', 'utf8'));

// forward handler
function forwardHandler(inUrl, outUrlV) {
	return function(req, res) { 
		console.log('Forwarding');
		console.log('  from: ' + inUrl);
		console.log('  data: "' + req.body + '"');
		// distribute to all map outputs
		for (var j = 0; j < outUrlV.length; j++) {
			// prepare request	
			var post_data = req.body;
			var post_options = {
				hostname: outUrlV[j].hostname,
				port: outUrlV[j].port,
				path: outUrlV[j].path,
				method: 'POST',
				headers: { 'Content-Length': post_data.length }
			};
			console.log('  to: ' + JSON.stringify(post_options));
			// execute request
			var post_req = http.request(post_options, function(res) {
				res.setEncoding('utf8');
				res.on('data', function (chunk) {
					// report response
					console.log('Response: ' + chunk);
				});
			});
			post_req.on('error', function (err) { 
				console.log('Problem with request: ' + err.message); 
			});
			post_req.write(post_data);
			post_req.end();
		}
		// done
		res.send("OK");
	}
}

// setup handles for each map input
var map = settings.map;
for (var i = 0; i < map.length; i++) {
	console.log("Registering '" + map[i].inUrl + '"');
	app.post(map[i].inUrl, forwardHandler(map[i].inUrl, map[i].outUrl));
}

// start server
console.log('Starting server on port ' + settings.port);
app.listen(settings.port);

