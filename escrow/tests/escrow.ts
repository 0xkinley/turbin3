import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, 
  createMint, 
  createAccount, 
  mintTo, 
  getAccount, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint
 } from "@solana/spl-token";
import { assert } from "chai";

describe("escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow as Program<Escrow>;
  
  let mintA: anchor.web3.PublicKey;
  let mintB: anchor.web3.PublicKey;
  let makerAtaA: anchor.web3.PublicKey;
  let makerAtaB: anchor.web3.PublicKey;
  let takerAtaA: anchor.web3.PublicKey;
  let takerAtaB: anchor.web3.PublicKey;
  let vault: anchor.web3.PublicKey;
  let escrow: anchor.web3.PublicKey;
  
  const maker = Keypair.generate();
  const taker = Keypair.generate();
  const seed = new anchor.BN(1);
  const depositAmount = new anchor.BN(50);
  
  before(async () => {
    const makerAirdrop = await provider.connection.requestAirdrop(maker.publicKey, 10 * LAMPORTS_PER_SOL);
    const takerAirdrop = await provider.connection.requestAirdrop(taker.publicKey, 10 * LAMPORTS_PER_SOL);
    
    const latestBlockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature: makerAirdrop,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    await provider.connection.confirmTransaction({
      signature: takerAirdrop,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    
    mintA = await createMint(provider.connection, maker, maker.publicKey, null, 6);
    mintB = await createMint(provider.connection, taker, taker.publicKey, null, 6);
    
    makerAtaA = await createAccount(provider.connection, maker, mintA, maker.publicKey);
    makerAtaB = await createAccount(provider.connection, maker, mintB, maker.publicKey);
    takerAtaA = await createAccount(provider.connection, taker, mintA, taker.publicKey);
    takerAtaB = await createAccount(provider.connection, taker, mintB, taker.publicKey);
    
    await mintTo(provider.connection, maker, mintA, makerAtaA, maker, 1000);
    await mintTo(provider.connection, taker, mintB, takerAtaB, taker, 1000);
    
    [escrow] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), seed.toBuffer('le', 8)],
      program.programId
    );
    
    vault = await anchor.utils.token.associatedAddress({
      mint: mintA,
      owner: escrow
    });
  });

  it("Makes escrow offer", async () => {
    await program.methods
      .makeOffer(seed, depositAmount)
      .accounts({
        maker: maker.publicKey,
        mintA,
        mintB,
        mint_ata_a: makerAtaA,
        vault,
        escrow,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    const escrowAccount = await program.account.escrow.fetch(escrow);
    assert.ok(escrowAccount.maker.equals(maker.publicKey));
    assert.ok(escrowAccount.mintA.equals(mintA));
    assert.ok(escrowAccount.mintB.equals(mintB));
    assert.ok(escrowAccount.receiveAmount.eq(depositAmount));

    const vaultAccount = await getAccount(provider.connection, vault);
    assert.ok(vaultAccount.amount === BigInt(depositAmount.toString()));
  });

  it("Takes escrow offer", async () => {
    const takerAtaABefore = await getAccount(provider.connection, takerAtaA);
    const takerAtaBBefore = await getAccount(provider.connection, takerAtaB);

    const mintAInfo = await getMint(provider.connection, mintA);
    const mintBInfo = await getMint(provider.connection, mintB);
  
    console.log("Mint A decimals:", mintAInfo.decimals);
    console.log("Mint B decimals:", mintBInfo.decimals);
    console.log("Vault balance:", (await getAccount(provider.connection, vault)).amount.toString());
    console.log("Taker ATA B balance:", (await getAccount(provider.connection, takerAtaB)).amount.toString());

    const escrowAccount = await program.account.escrow.fetch(escrow);
    console.log("Escrow state:", {
      maker: escrowAccount.maker.toString(),
      receiveAmount: escrowAccount.receiveAmount.toString(),
      mintA: escrowAccount.mintA.toString(),
      mintB: escrowAccount.mintB.toString()
    });
    
    await program.methods
      .takeOffer()
      .accounts({
        taker: taker.publicKey,
        maker: maker.publicKey,
        mintA,
        mintB,
        taker_ata_a: takerAtaA,
        taker_ata_b: takerAtaB,
        maker_ata_b: makerAtaB,
        escrow,
        vault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();
  
    // Verify taker received tokens from vault
    const takerAtaAAfter = await getAccount(provider.connection, takerAtaA);
    assert.equal(
      takerAtaAAfter.amount - takerAtaABefore.amount,
      BigInt(depositAmount.toString())
    );
  
    // Verify maker received tokens from taker
    const makerAtaBAccount = await getAccount(provider.connection, makerAtaB);
    assert.equal(makerAtaBAccount.amount, BigInt(depositAmount.toString()));
  
    // Verify escrow account closed
    try {
      await program.account.escrow.fetch(escrow);
      assert.fail("Escrow account should be closed");
    } catch (err) {
      assert.match(err.toString(), /Account does not exist/);
    }
  });
  
  it("Refunds escrow", async () => {
    // Create new escrow for refund test
    const newSeed = new anchor.BN(2);
    const [newEscrow] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), newSeed.toBuffer("le", 8)],
      program.programId
    );
  
    const newVault = await anchor.utils.token.associatedAddress({
      mint: mintA,
      owner: newEscrow
    });
  
    // Get initial balance
    const makerAtaABefore = await getAccount(provider.connection, makerAtaA);
  
    // Make new offer
    await program.methods
      .makeOffer(newSeed, depositAmount)
      .accounts({
        maker: maker.publicKey,
        mintA,
        mintB,
        mintAtaA: makerAtaA,
        vault: newVault,
        escrow: newEscrow,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();
  
    // Refund
    await program.methods
      .refund()
      .accounts({
        maker: maker.publicKey,
        mintA,
        makerAtaA,
        escrow: newEscrow,
        vault: newVault,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();
  
    // Verify tokens returned
    const makerAtaAAfter = await getAccount(provider.connection, makerAtaA);
    assert.equal(
      makerAtaAAfter.amount,
      makerAtaABefore.amount,
      "Tokens should be refunded"
    );
  
    // Verify escrow closed
    try {
      await program.account.escrow.fetch(newEscrow);
      assert.fail("Escrow account should be closed");
    } catch (err) {
      assert.match(err.toString(), /Account does not exist/);
    }
  });
});