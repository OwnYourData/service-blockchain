'use strict';

var privatekey;
var address;

exports.setPrivatekey = function(pk) {
  privatekey = pk;
  if(pk)
    console.log("Setting the private key.");
  else {
    console.log("No private key given. Server restart needed.");
    process.exit(1);
  }
}

exports.setAddress = function(addr) {
  address = addr;
  if(address) {
    console.log("Using custom receive address: " + address);
  } else {
    console.log("Generating receive address from private key.")
  }
}

exports.createTransaction = function(req, res) {
  if(!privatekey) {
    var errJson = {
      "id" : req.body.id,
      "status" : 502,

      "error" : "Missing Private Key. Restart api server."
    };
    res.statusCode = 500;
    res.json(errJson);
  } else {
  //FIXME: remove fake errors
    if(req.body.id == 666) {
      var errJson = {
        "id" : req.body.id,
        "status" : 500,
        "error" : "Internal Server error"
      };
      res.statusCode = 500;
      res.json(errJson);
    } else if(req.body.id == 0){
      var errJson = {
        "id" : req.body.id,
        "status" : 501,
        "error" : "Out Of Funds"
      };
      res.statusCode = 500;
      res.json(errJson);
    } else {
      var successJson = {
        "id" : req.body.id,
        "transaction-id" :  req.body.hash + req.body.hash,
        "status" : 200
      };
      res.json(successJson);
    }
  }
};
