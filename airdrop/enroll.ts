import { Connection, Keypair, PublicKey } from "@solana/web3.js"
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor"
import { IDL, Turbin3Prereq } from "./programs/Turbin3_prereq";
import wallet from "./turbine-wallet.json";

const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));
console.log(keypair);

const connection = new Connection("https://api.devnet.solana.com");

const github = Buffer.from("0xkinley", "utf8");

const provider = new AnchorProvider(connection, new Wallet(keypair), {
    commitment: "confirmed"});

const program : Program<Turbin3Prereq> = new Program(IDL, provider);

// Create the PDA for our enrollment account
const enrollment_seeds = [Buffer.from("prereq"),
    keypair.publicKey.toBuffer()];
    const [enrollment_key, _bump] =
    PublicKey.findProgramAddressSync(enrollment_seeds, program.programId);

// Execute our enrollment transaction
(async () => {
    try {
        const txhash = await program.methods
            .complete(github)
            .accounts({
                signer: keypair.publicKey,
            })
            .signers([keypair])
            .rpc();

        console.log(`Success! Check out your TX here: https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`);
    }
})();