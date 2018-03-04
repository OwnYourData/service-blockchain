var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var configuration = require('./configuration');

//set up json parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//set up routes
var routes = require('./api/routes/blockchainRoutes');
routes(app);

//handle invalid request urls
app.use(function(req, res) {
  res.status(404).send(
    {
      "status" : 404,
      "error" : "url:" + req.originalUrl + " not found"
    })
});

//Start Rest Server
app.listen(configuration.port, function() {
  console.log('Blockchain RESTful API server started on port: ' + configuration.port);
});
