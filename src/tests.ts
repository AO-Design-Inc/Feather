import Arweave from 'arweave';
const arweave = Arweave.init({
    host: '127.0.0.1',
    port: 1984,
    protocol: 'http'
});
let key = await arweave.wallets.generate();

// Plain text
let transactionA = await arweave.createTransaction({
    data: '<html><head><meta charset="UTF-8"><title>Hello world!</title></head><body></body></html>'
}, key);

// Buffer
let transactionB = await arweave.createTransaction({
    data: Buffer.from('Some data', 'utf8')
}, key);


console.log(transactionA);
