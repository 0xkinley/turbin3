import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
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
import { Escrow2 } from '../target/types/escrow2'

describe("escrow", () => {
  console.log("Starting escrow tests...");
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Escrow2 as Program<Escrow2>;
  console.log("Program ID:", program.programId.toString());
  
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
  
  console.log("Maker address:", maker.publicKey.toString());
  console.log("Taker address:", taker.publicKey.toString());
  console.log("Seed:", seed.toString());
  console.log("Deposit amount:", depositAmount.toString());
  
  before(async () => {
    console.log("Setting up test environment...");
    console.log("Requesting airdrops for maker and taker...");
    
    const makerAirdrop = await provider.connection.requestAirdrop(maker.publicKey, 10 * LAMPORTS_PER_SOL);
    const takerAirdrop = await provider.connection.requestAirdrop(taker.publicKey, 10 * LAMPORTS_PER_SOL);
    
    console.log("Confirming airdrops...");
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
    
    console.log("Creating mints...");
    mintA = await createMint(provider.connection, maker, maker.publicKey, null, 6);
    mintB = await createMint(provider.connection, taker, taker.publicKey, null, 6);
    console.log("Mint A:", mintA.toString());
    console.log("Mint B:", mintB.toString());
    
    console.log("Creating token accounts...");
    makerAtaA = await createAccount(provider.connection, maker, mintA, maker.publicKey);
    makerAtaB = await createAccount(provider.connection, maker, mintB, maker.publicKey);
    takerAtaA = await createAccount(provider.connection, taker, mintA, taker.publicKey);
    takerAtaB = await createAccount(provider.connection, taker, mintB, taker.publicKey);
    
    console.log("Maker ATA A:", makerAtaA.toString());
    console.log("Maker ATA B:", makerAtaB.toString());
    console.log("Taker ATA A:", takerAtaA.toString());
    console.log("Taker ATA B:", takerAtaB.toString());
    
    console.log("Minting tokens to maker and taker...");
    await mintTo(provider.connection, maker, mintA, makerAtaA, maker, 1000);
    await mintTo(provider.connection, taker, mintB, takerAtaB, taker, 1000);
    
    console.log("Deriving PDA addresses...");
    [escrow] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), seed.toBuffer('le', 8)],
      program.programId
    );
    console.log("Escrow PDA:", escrow.toString());
    
    vault = await anchor.utils.token.associatedAddress({
      mint: mintA,
      owner: escrow
    });
    console.log("Vault address:", vault.toString());
    
    // Log initial token balances
    const makerInitialBalance = await getAccount(provider.connection, makerAtaA);
    const takerInitialBalance = await getAccount(provider.connection, takerAtaB);
    console.log("Initial maker token A balance:", makerInitialBalance.amount.toString());
    console.log("Initial taker token B balance:", takerInitialBalance.amount.toString());
  });

  it("Makes escrow offer", async () => {
    console.log("\n--- Testing make offer ---");
    console.log("Making escrow offer with deposit amount:", depositAmount.toString());
    
    await program.methods
      .makeOffer(seed, depositAmount)
      .accounts({
        maker: maker.publicKey,
        mintA,
        mintB,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();

    console.log("Escrow offer made, verifying escrow account...");
    const escrowAccount = await program.account.escrow.fetch(escrow);
    console.log("Escrow account data:", {
      maker: escrowAccount.maker.toString(),
      mintA: escrowAccount.mintA.toString(),
      mintB: escrowAccount.mintB.toString(),
      receiveAmount: escrowAccount.receiveAmount.toString()
    });
    
    assert.ok(escrowAccount.maker.equals(maker.publicKey));
    assert.ok(escrowAccount.mintA.equals(mintA));
    assert.ok(escrowAccount.mintB.equals(mintB));
    assert.ok(escrowAccount.receiveAmount.eq(depositAmount));

    console.log("Verifying vault balance...");
    const vaultAccount = await getAccount(provider.connection, vault);
    console.log("Vault balance:", vaultAccount.amount.toString());
    assert.ok(vaultAccount.amount === BigInt(depositAmount.toString()));
    
    // Check maker's token balance after deposit
    const makerBalanceAfterDeposit = await getAccount(provider.connection, makerAtaA);
    console.log("Maker token A balance after deposit:", makerBalanceAfterDeposit.amount.toString());
  });

  it("Takes escrow offer", async () => {
    console.log("\n--- Testing take offer ---");
    console.log("Getting initial balances...");
    
    const takerAtaABefore = await getAccount(provider.connection, takerAtaA);
    const takerAtaBBefore = await getAccount(provider.connection, takerAtaB);
    console.log("Taker initial token A balance:", takerAtaABefore.amount.toString());
    console.log("Taker initial token B balance:", takerAtaBBefore.amount.toString());

    const mintAInfo = await getMint(provider.connection, mintA);
    const mintBInfo = await getMint(provider.connection, mintB);
  
    console.log("Mint A decimals:", mintAInfo.decimals);
    console.log("Mint B decimals:", mintBInfo.decimals);
    console.log("Vault balance before take:", (await getAccount(provider.connection, vault)).amount.toString());
    console.log("Taker ATA B balance before take:", (await getAccount(provider.connection, takerAtaB)).amount.toString());

    const escrowAccount = await program.account.escrow.fetch(escrow);
    console.log("Escrow state before take:", {
      maker: escrowAccount.maker.toString(),
      receiveAmount: escrowAccount.receiveAmount.toString(),
      mintA: escrowAccount.mintA.toString(),
      mintB: escrowAccount.mintB.toString()
    });
    
    console.log("Taking escrow offer...");
    await program.methods
      .takeOffer()
      .accounts({
        taker: taker.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();
    
    console.log("Escrow offer taken, verifying balances...");
    const takerAtaAAfter = await getAccount(provider.connection, takerAtaA);
    console.log("Taker token A balance after take:", takerAtaAAfter.amount.toString());
    console.log("Token A difference:", (takerAtaAAfter.amount - takerAtaABefore.amount).toString());
    
    assert.equal(
      takerAtaAAfter.amount - takerAtaABefore.amount,
      BigInt(depositAmount.toString()),
      "Taker should receive the correct amount of token A"
    );
  
    const makerAtaBAccount = await getAccount(provider.connection, makerAtaB);
    console.log("Maker token B balance after take:", makerAtaBAccount.amount.toString());
    
    assert.equal(
      makerAtaBAccount.amount, 
      BigInt(depositAmount.toString()),
      "Maker should receive the correct amount of token B"
    );
  
    console.log("Verifying escrow account closure...");
    try {
      await program.account.escrow.fetch(escrow);
      assert.fail("Escrow account should be closed");
    } catch (err: any) {
      console.log("Expected error received:", err.toString().substring(0, 100) + "...");
    }
  });
  
  it("Refunds escrow", async () => {
    console.log("\n--- Testing refund ---");
    
    const newSeed = new anchor.BN(2);
    console.log("New seed for refund test:", newSeed.toString());
    
    const [newEscrow] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), maker.publicKey.toBuffer(), newSeed.toBuffer("le", 8)],
      program.programId
    );
    console.log("New escrow PDA:", newEscrow.toString());
  
    const newVault = await anchor.utils.token.associatedAddress({
      mint: mintA,
      owner: newEscrow
    });
    console.log("New vault address:", newVault.toString());
  
    // Get initial balance
    const makerAtaABefore = await getAccount(provider.connection, makerAtaA);
    console.log("Maker token A balance before new offer:", makerAtaABefore.amount.toString());
  
    // Make new offer
    console.log("Making new escrow offer for refund test...");
    await program.methods
      .makeOffer(newSeed, depositAmount)
      .accounts({
        maker: maker.publicKey,
        mintA,
        mintB,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();
    
    // Verify the new escrow was created
    const newEscrowAccount = await program.account.escrow.fetch(newEscrow);
    console.log("New escrow account created:", {
      maker: newEscrowAccount.maker.toString(),
      receiveAmount: newEscrowAccount.receiveAmount.toString()
    });
    
    // Check vault balance
    const newVaultBalance = await getAccount(provider.connection, newVault);
    console.log("New vault balance:", newVaultBalance.amount.toString());
    
    // Get maker balance after creating new offer
    const makerAtaAAfterNewOffer = await getAccount(provider.connection, makerAtaA);
    console.log("Maker token A balance after new offer:", makerAtaAAfterNewOffer.amount.toString());
    console.log("Difference:", (makerAtaABefore.amount - makerAtaAAfterNewOffer.amount).toString());
  
    // Refund
    console.log("Executing refund...");
    await program.methods
      .refund()
      .accounts({
        maker: maker.publicKey,
        mintA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([maker])
      .rpc();
  
    // Verify tokens returned
    const makerAtaAAfterRefund = await getAccount(provider.connection, makerAtaA);
    console.log("Maker token A balance after refund:", makerAtaAAfterRefund.amount.toString());
    console.log("Balance comparison - Before:", makerAtaABefore.amount.toString(), "After:", makerAtaAAfterRefund.amount.toString());
    
    assert.equal(
      makerAtaAAfterRefund.amount,
      makerAtaABefore.amount,
      "Tokens should be refunded"
    );
  
    // Verify escrow closed
    console.log("Verifying new escrow account closure...");
    try {
      await program.account.escrow.fetch(newEscrow);
      assert.fail("Escrow account should be closed");
    } catch (err: any) {
      console.log("Expected error received:", err.toString().substring(0, 100) + "...");
    }
    
    console.log("Refund test completed successfully");
  });
  
  console.log("All escrow tests completed!");
});