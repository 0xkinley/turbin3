import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftStaking } from "../target/types/nft_staking";
import {
  Metaplex,
  keypairIdentity,
} from "@metaplex-foundation/js";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("nft-staking", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NftStaking as Program<NftStaking>;
  
  const wallet = (provider.wallet as anchor.Wallet).payer;
  const metaplex = Metaplex.make(provider.connection).use(keypairIdentity(wallet));

  let configPda: PublicKey;
  let rewardsMintPda: PublicKey;
  let userPda: PublicKey;
  let stakePda: PublicKey;
  let collectionMint: PublicKey;
  let nftMint: PublicKey;
  let nftAta: PublicKey;

  const POINTS_PER_STAKE = 10;
  const MAX_STAKE = 5;
  const FREEZE_PERIOD = 1; // 1 day for testing

  before(async () => {
    // Find PDAs
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [rewardsMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("rewards"), configPda.toBuffer()],
      program.programId
    );

    [userPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    // Create collection NFT
    const collectionNft = await metaplex.nfts().create({
      uri: "https://example.com/collection.json",
      name: "Test Collection",
      sellerFeeBasisPoints: 0,
      isCollection: true,
    });
    collectionMint = collectionNft.nft.address;

    // Create NFT
    const nft = await metaplex.nfts().create({
      uri: "https://example.com/nft.json",
      name: "Test NFT",
      sellerFeeBasisPoints: 0,
      collection: collectionNft.nft.address,
    });
    nftMint = nft.nft.address;

    // Verify NFT belongs to collection
    await metaplex.nfts().verifyCollection({
      mintAddress: nftMint,
      collectionMintAddress: collectionMint,
    });

    // Get NFT ATA
    nftAta = await getAssociatedTokenAddress(
      nftMint,
      provider.wallet.publicKey
    );

    // Find stake PDA
    [stakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), nftMint.toBuffer(), configPda.toBuffer()],
      program.programId
    );
  });

  it("Initialize Config", async () => {
    await program.methods
      .initializeConfig(POINTS_PER_STAKE, MAX_STAKE, FREEZE_PERIOD)
      .accounts({
        admin: provider.wallet.publicKey,
        config: configPda,
        rewardsMint: rewardsMintPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const config = await program.account.stakeConfig.fetch(configPda);
    assert.equal(config.pointsPerStake, POINTS_PER_STAKE);
    assert.equal(config.maxStake, MAX_STAKE);
    assert.equal(config.freezePeriod, FREEZE_PERIOD);
  });

  it("Initialize User", async () => {
    await program.methods
      .initializeUser()
      .accounts({
        user: provider.wallet.publicKey,
        userAccount: userPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const userAccount = await program.account.userAccount.fetch(userPda);
    assert.equal(userAccount.points, 0);
    assert.equal(userAccount.amountStake, 0);
  });

  it("Stake NFT", async () => {
    const metadata = metaplex.nfts().pdas().metadata({ mint: nftMint });
    const masterEdition = metaplex.nfts().pdas().masterEdition({ mint: nftMint });

    await program.methods
      .stake()
      .accounts({
        user: provider.wallet.publicKey,
        mint: nftMint,
        collectionMint: collectionMint,
        mintAta: nftAta,
        metadata: metadata,
        edition: masterEdition,
        config: configPda,
        stakeAccount: stakePda,
        userAccount: userPda,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        metadataProgram: mpl.MPL_TOKEN_METADATA_PROGRAM_ID,
      })
      .rpc();

    const stakeAccount = await program.account.stakeAccount.fetch(stakePda);
    assert.equal(stakeAccount.owner.toBase58(), provider.wallet.publicKey.toBase58());
    assert.equal(stakeAccount.mint.toBase58(), nftMint.toBase58());

    const userAccount = await program.account.userAccount.fetch(userPda);
    assert.equal(userAccount.amountStake, 1);
  });

  it("Try to unstake before freeze period", async () => {
    try {
      const masterEdition = metaplex.nfts().pdas().masterEdition({ mint: nftMint });
      
      await program.methods
        .unstake()
        .accounts({
          user: provider.wallet.publicKey,
          mint: nftMint,
          mintAta: nftAta,
          edition: masterEdition,
          config: configPda,
          stakeAccount: stakePda,
          userAccount: userPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          metadataProgram: mpl.MPL_TOKEN_METADATA_PROGRAM_ID,
        })
        .rpc();
      assert.fail("Should have failed");
    } catch (err) {
      assert.equal(err.error.errorCode.code, "FreezePeriodNotPassed");
    }
  });
});