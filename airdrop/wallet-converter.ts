// import bs58 from 'bs58';
// import promptSync from 'prompt-sync';
// const prompt = promptSync();

// let wallet_arraye = [
//     34,  90,  89, 119, 195,  39,  93,  98,  52, 250, 220,
//    143,  33, 160,   2,  60, 167, 101, 138,  71, 179,  77,
//    247,  69, 246, 248,  45, 109, 197, 237,  25, 107,  54,
//      1,  12, 134,  16, 169,  49,  32, 175, 223, 197, 123,
//    108, 102,  56, 203,  74,  60, 229, 175,  16, 254, 139,
//     81,   5, 102,  27, 182, 251,  28, 224,  54
//  ];

// function main() {
//     console.log('Welcome to the Solana wallet converter!');
//     console.log('1. Convert Base58 to Wallet Array');
//     console.log('2. Convert Wallet Array to Base58');
    
//     const choice = prompt('Choose an option (1 or 2): ');

//     switch(choice) {
//         case '1':
//             base58ToWallet();
//             break;
//         case '2':
//             walletToBase58(wallet_arraye);
//             break;
//         default:
//             console.log('Invalid choice');
//     }
// }

// function base58ToWallet() {
//     console.log("Enter your base58 private key:");
//     const base58Input = prompt('> ');
    
//     if (!base58Input) {
//         console.error('No input provided');
//         return;
//     }

//     try {
//         const wallet = bs58.decode(base58Input);
//         console.log('Wallet array:');
//         console.log(Array.from(wallet));
//     } catch (error) {
//         console.error('Error decoding base58 string:', error);
//     }
// }

// function walletToBase58(walletArray: number[]) {
//     try {
//         const base58String = bs58.encode(Buffer.from(walletArray));
//         console.log('Base58 string:');
//         console.log(base58String);
//     } catch (error) {
//         console.error('Error encoding wallet array:', error);
//     }
// }

// main();

import bs58 from "bs58";
const prompt = require("prompt-sync")();

// Take input as comma-separated bytes
const privateKey: string = prompt("Enter the private key (bytes array): ");
const privateKeyBytes = privateKey.split(",").map((byte) => parseInt(byte.trim(), 10));
console.log("private key bytes", privateKeyBytes);

// Convert byte array to Base58
const base58 = bs58.encode(privateKeyBytes);
console.log("\n\n\nPrivate Key (Base58): ", base58);