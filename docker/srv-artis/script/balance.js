// Arguments
// args[2] - provider, e.g., https://rpc.tau1.artis.network
// args[3] - private key (0x...)

const args = process.argv;
const provider = args[2];
const privateKey = args[3];

const Web3 = require('web3');
const web3 = new Web3(provider);
const address = web3.eth.accounts.privateKeyToAccount(privateKey).address;

 web3.eth.getBalance(address).then(console.log);