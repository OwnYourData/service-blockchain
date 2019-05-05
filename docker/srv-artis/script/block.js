// Arguments
// args[2] - provider, e.g., https://rpc.tau1.artis.network
// args[3] - private key (0x...)

const args = process.argv;
const provider = args[2];
const block = args[3];

const Web3 = require('web3');
const web3 = new Web3(provider);

web3.eth.getBlock(block).then(console.log);
