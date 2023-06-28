import { Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import * as fs from 'fs';

const endpoint = "https://autumn-empty-mountain.solana-devnet.discover.quiknode.pro/bc4d99cc3ae53a78fdcd9496e00f2679ba34045a/"

const solanaConnection = new Connection(endpoint);

const keypair = Keypair.generate();
console.log(`Generated new KeyPair. Wallet PublicKey: `, keypair.publicKey.toString());

const secret_array = keypair.secretKey 
.toString() //convert secret key to string
.split(',') //delimit string by commas and convert to an array of strings
.map(value=>Number(value)); //convert string values to numbers inside the array

const secret = JSON.stringify(secret_array); //Covert to JSON string

fs.writeFile('guideSecret.json', secret, 'utf8', function(err) {
    if (err) throw err;
    console.log('Wrote secret key to guideSecret.json.');
    });

    