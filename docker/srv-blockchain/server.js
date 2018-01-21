var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const commandLineArgs = require('command-line-args');
const options = commandLineArgs([
  { name: 'port', alias: 'p', type: Number },
  { name: 'privatekey', alias : 'k', type: String},
  { name: 'address', alias: 'a', type: String  }
]);
const port = options.port || 3010;

//set up json parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//set up routes
var routes = require('./api/routes/blockchainRoutes');
routes(app,options);

//handle invalid request urls
app.use(function(req, res) {
  res.status(404).send(
    {
      "status" : 404,
      "error" : "url:" + req.originalUrl + " not found"
    })
});

//Start server
app.listen(port, function() {
  console.log('Blockchain RESTful API server started on port: ' + port);
});
