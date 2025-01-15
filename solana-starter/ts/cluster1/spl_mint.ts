import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import wallet from "../wba-wallet.json";

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 1_000_000n;

// Mint address
const mint = new PublicKey("7RaxRtYbvitybhn4LCjEHnXM1WQAFX8D941xYoXuZt24");

(async () => {
    try {
        const ata = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);

        const mint_to_ata = await mintTo(connection, keypair, mint, ata.address, keypair.publicKey, 98998876799000);

        console.log(`associated token account address: ${ata.address}`); // BYvMTgr2RsBBMoQBDL2NjoiC3TqyNPPWhCLQHfUQavnr
        console.log(`Mint to ata address: ${mint_to_ata}`); // 6188CXA8oDmUKHmPzH8dUAPw8J1uxuGsgdRKST5UaRX78aF2JQGcYNQ64oPyLcuEE21bT48nA5Z9U2GZeCgLvxUP
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
