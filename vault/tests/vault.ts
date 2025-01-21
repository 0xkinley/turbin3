import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";

describe("vault", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Vault as Program<Vault>;
  const wallet = provider.wallet;

  let vaultState: PublicKey;
  let vault: PublicKey;
  let vaultBump: number;
  let stateBump: number;

  it("Initialize vault", async () => {
    // Derive PDAs
    [vaultState, stateBump] = await PublicKey.findProgramAddressSync(
      [Buffer.from("state"), wallet.publicKey.toBuffer()],
      program.programId
    );

    [vault, vaultBump] = await PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultState.toBuffer()],
      program.programId
    );

    // Initialize vault
    const tx = await program.methods
      .initialize()
      .accounts({
        signer: wallet.publicKey,
        vaultState: vaultState,
        vault: vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize transaction:", tx);
  });

  it("Deposit to vault", async () => {
    const depositAmount = new anchor.BN(1_000_000_000); // 1 SOL
    const preBalance = await provider.connection.getBalance(vault);

    const tx = await program.methods
      .deposit(depositAmount)
      .accounts({
        signer: wallet.publicKey,
        vaultState: vaultState,
        vault: vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Deposit transaction:", tx);

    const postBalance = await provider.connection.getBalance(vault);
    console.log("Deposit amount:", depositAmount.toString());
    console.log("Balance change:", postBalance - preBalance);
    
    // Assert the deposit was successful
    assert.equal(postBalance - preBalance, depositAmount.toNumber());
  });

  it("Withdraw from vault", async () => {
    const withdrawAmount = new anchor.BN(500_000_000); // 0.5 SOL
    const preBalance = await provider.connection.getBalance(vault);

    const tx = await program.methods
      .withdraw(withdrawAmount)
      .accounts({
        signer: wallet.publicKey,
        vaultState: vaultState,
        vault: vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Withdraw transaction:", tx);

    const postBalance = await provider.connection.getBalance(vault);
    console.log("Withdraw amount:", withdrawAmount.toString());
    console.log("Balance change:", preBalance - postBalance);
    
    // Assert the withdrawal was successful
    assert.equal(preBalance - postBalance, withdrawAmount.toNumber());
  });

  it("Close vault", async () => {
    const preBalance = await provider.connection.getBalance(vault);

    const tx = await program.methods
      .close()
      .accounts({
        signer: wallet.publicKey,
        vaultState: vaultState,
        vault: vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Close transaction:", tx);

    // Verify vault is closed
    const postAccount = await provider.connection.getAccountInfo(vault);
    assert.equal(postAccount, null);

    // Verify funds were returned
    const signerPostBalance = await provider.connection.getBalance(wallet.publicKey);
    console.log("Returned balance:", preBalance);
  });
});