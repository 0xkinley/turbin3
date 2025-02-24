import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Capstone } from "../target/types/capstone";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { TOKEN_PROGRAM_ID, 
  createMint, 
  createAccount, 
  mintTo, 
  getAccount, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getMint
 } from "@solana/spl-token";

describe("Admin Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Capstone as Program<Capstone>;
  
  // Test accounts
  const admin = Keypair.generate();
  const nonAdmin = Keypair.generate();
  let testFreelancer: Keypair;
  let testEmployer: Keypair;

  // PDAs
  let adminPDA: PublicKey;
  let freelancerPDA: PublicKey;
  let employerPDA: PublicKey;
  
  beforeEach(async () => {
    // Generate new test accounts for each test
    testFreelancer = Keypair.generate();
    testEmployer = Keypair.generate();

    // Airdrop SOL to admin and nonAdmin for transaction fees
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(
        admin.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      ),
      provider.connection.requestAirdrop(
        nonAdmin.publicKey,
        1 * anchor.web3.LAMPORTS_PER_SOL
      )
    ]);
    
    await Promise.all(signatures.map(sig => provider.connection.confirmTransaction(sig)));

    // Find PDAs
    [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), admin.publicKey.toBuffer()],
      program.programId
    );

    [freelancerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer"), testFreelancer.publicKey.toBuffer()],
      program.programId
    );

    [employerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("employer"), testEmployer.publicKey.toBuffer()],
      program.programId
    );

    // Initialize admin
    try {
      await program.methods
        .initializeAdmin()
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }
  });

  it("Should initialize admin configuration", async () => {
    const adminAccount = await program.account.adminConfig.fetch(adminPDA);
    expect(adminAccount.admin.toString()).to.equal(admin.publicKey.toString());
  });

  it("Should whitelist a freelancer", async () => {
    await program.methods
      .whitelistFreelancer(
        testFreelancer.publicKey,
        "TestFreelancer",
        { developer: {} }
      )
      .accounts({
        admin: admin.publicKey,
        adminConfig: adminPDA,
        freelancerAccount: freelancerPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const freelancerAccount = await program.account.whitelistFreelancer.fetch(freelancerPDA);
    expect(freelancerAccount.freelancer.toString()).to.equal(testFreelancer.publicKey.toString());
    expect(freelancerAccount.userName).to.equal("TestFreelancer");
    expect(freelancerAccount.isWhitelisted).to.be.true;
  });

  it("Should fail when non-admin tries to whitelist a freelancer", async () => {
    let error: anchor.AnchorError | null = null;
    try {
      await program.methods
        .whitelistFreelancer(
          testFreelancer.publicKey,
          "TestFreelancer",
          { developer: {} }
        )
        .accounts({
          admin: nonAdmin.publicKey,
          adminConfig: adminPDA,
          freelancerAccount: freelancerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([nonAdmin])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (err) {
      error = err as anchor.AnchorError;
      expect(error.error.errorCode.code).to.equal("UnauthorizedAdmin");
    }
  });

  // Rest of the test cases remain the same...
  it("Should whitelist an employer", async () => {
    await program.methods
      .whitelistEmployer(
        testEmployer.publicKey,
        "TestUser",
        "TestCompany"
      )
      .accounts({
        admin: admin.publicKey,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const employerAccount = await program.account.whitelistEmployer.fetch(employerPDA);
    expect(employerAccount.employer.toString()).to.equal(testEmployer.publicKey.toString());
    expect(employerAccount.userName).to.equal("TestUser");
    expect(employerAccount.companyName).to.equal("TestCompany");
    expect(employerAccount.isWhitelisted).to.be.true;
  });

  it("Should remove a freelancer from whitelist", async () => {
    // First whitelist the freelancer
    await program.methods
      .whitelistFreelancer(
        testFreelancer.publicKey,
        "TestFreelancer",
        { developer: {} }
      )
      .accounts({
        admin: admin.publicKey,
        adminConfig: adminPDA,
        freelancerAccount: freelancerPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    // Then remove from whitelist
    await program.methods
      .removeFreelancer(testFreelancer.publicKey)
      .accounts({
        admin: admin.publicKey,
        adminConfig: adminPDA,
        freelancerAccount: freelancerPDA,
      })
      .signers([admin])
      .rpc();

    const freelancerAccount = await program.account.whitelistFreelancer.fetch(freelancerPDA);
    expect(freelancerAccount.isWhitelisted).to.be.false;
  });

  it("Should check freelancer whitelist status", async () => {
    await program.methods
      .whitelistFreelancer(
        testFreelancer.publicKey,
        "TestFreelancer",
        { developer: {} }
      )
      .accounts({
        admin: admin.publicKey,
        adminConfig: adminPDA,
        freelancerAccount: freelancerPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const freelancerAccount = await program.account.whitelistFreelancer.fetch(freelancerPDA);
    expect(freelancerAccount.isWhitelisted).to.be.true;
  });

  it("Should check employer whitelist status", async () => {
    await program.methods
      .whitelistEmployer(
        testEmployer.publicKey,
        "TestUser",
        "TestCompany"
      )
      .accounts({
        admin: admin.publicKey,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const employerAccount = await program.account.whitelistEmployer.fetch(employerPDA);
    expect(employerAccount.isWhitelisted).to.be.true;
  });
});
describe("Project Creation Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Capstone as Program<Capstone>;
  
  // Test accounts
  const admin = Keypair.generate();
  const employer = Keypair.generate();
  let tokenMint: PublicKey;
  let employerATA: PublicKey;
  
  // PDAs
  let adminPDA: PublicKey;
  let employerPDA: PublicKey;
  let projectPDA: PublicKey;
  let projectDetailsPDA: PublicKey;
  let escrowPDA: PublicKey;
  let vaultPDA: PublicKey;
  let projectId: anchor.BN;
  let projectIdCounter = 0;
  
  const projectBudget = new anchor.BN(1000);

  beforeEach(async () => {
    projectIdCounter += 1;
    projectId = new anchor.BN(projectIdCounter);

    // Airdrop SOL for transaction fees
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(employer.publicKey, 2 * LAMPORTS_PER_SOL)
    ]);
    
    await Promise.all(signatures.map(sig => provider.connection.confirmTransaction(sig)));

    // Create token mint
    tokenMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6
    );

    // Create employer's token account
    employerATA = await createAccount(
      provider.connection,
      employer,
      tokenMint,
      employer.publicKey
    );

    // Mint tokens to employer
    await mintTo(
      provider.connection,
      employer,
      tokenMint,
      employerATA,
      admin,
      2000
    );

    // Find PDAs
    [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), admin.publicKey.toBuffer()],
      program.programId
    );

    [employerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("employer"), employer.publicKey.toBuffer()],
      program.programId
    );

    [projectPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        employer.publicKey.toBuffer(),
        projectId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    [projectDetailsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("project_details"), projectPDA.toBuffer()],
      program.programId
    );

    [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), projectPDA.toBuffer()],
      program.programId
    );

    vaultPDA = await getAssociatedTokenAddress(
      tokenMint,
      escrowPDA,
      true
    );

    // Initialize admin
    try {
      await program.methods
        .initializeAdmin()
        .accountsPartial({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Whitelist employer
    try {
      await program.methods
        .whitelistEmployer(
          employer.publicKey,
          "Test Employer",
          "Test Company"
        )
        .accountsPartial({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          employerAccount: employerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }
  });

  it("Should initialize a project", async () => {
    await program.methods
      .initializeProject(
        projectId,
        "Test Project",
        projectBudget
      )
      .accountsPartial({
        employer: employer.publicKey,
        tokenMint,
        tokenAta: employerATA,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        project: projectPDA,
        escrow: escrowPDA,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const project = await program.account.project.fetch(projectPDA);
    expect(project.employer.toString()).to.equal(employer.publicKey.toString());
    expect(project.title).to.equal("Test Project");
    expect(project.totalBudget.toString()).to.equal(projectBudget.toString());
    expect(project.remainingBudget.toString()).to.equal(projectBudget.toString());
    expect(project.projectStatus).to.deep.equal({ open: {} });
  });

  it("Should fail to initialize project with invalid budget", async () => {
    try {
      await program.methods
        .initializeProject(
          projectId,
          "Test Project",
          new anchor.BN(0)  // Invalid budget
        )
        .accounts({
          employer: employer.publicKey,
          tokenMint,
          tokenAta: employerATA,
          adminConfig: adminPDA,
          employerAccount: employerPDA,
          project: projectPDA,
          escrow: escrowPDA,
          vault: vaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("InvalidBudget");
    }
  });

  it("Should fail to initialize project with title too long", async () => {
    try {
      await program.methods
        .initializeProject(
          projectId,
          "x".repeat(101),  // Title longer than 100 characters
          projectBudget
        )
        .accounts({
          employer: employer.publicKey,
          tokenMint,
          tokenAta: employerATA,
          adminConfig: adminPDA,
          employerAccount: employerPDA,
          project: projectPDA,
          escrow: escrowPDA,
          vault: vaultPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("TitleTooLong");
    }
  });

  it("Should transfer project budget to vault on initialization", async () => {
    await program.methods
      .initializeProject(
        projectId,
        "Test Project",
        projectBudget
      )
      .accounts({
        employer: employer.publicKey,
        tokenMint,
        tokenAta: employerATA,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        project: projectPDA,
        escrow: escrowPDA,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const vaultAccount = await getAccount(provider.connection, vaultPDA);
    expect(vaultAccount.amount.toString()).to.equal(projectBudget.toString());
  });
});
describe("Project Details With Different Professions", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Capstone as Program<Capstone>;
  
  // Test accounts
  const admin = Keypair.generate();
  const employer = Keypair.generate();
  let tokenMint: PublicKey;
  let employerATA: PublicKey;
  
  // PDAs
  let adminPDA: PublicKey;
  let employerPDA: PublicKey;
  
  const projectBudget = new anchor.BN(1000);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const futureDeadline = currentTimestamp + 86400; // 24 hours from now

  beforeEach(async () => {
    // Airdrop SOL for transaction fees
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(employer.publicKey, 2 * LAMPORTS_PER_SOL)
    ]);
    
    await Promise.all(signatures.map(sig => provider.connection.confirmTransaction(sig)));

    // Create token mint
    tokenMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6
    );

    // Create employer's token account
    employerATA = await createAccount(
      provider.connection,
      employer,
      tokenMint,
      employer.publicKey
    );

    // Mint tokens to employer
    await mintTo(
      provider.connection,
      employer,
      tokenMint,
      employerATA,
      admin,
      2000 * 3 // Enough for 3 projects
    );

    // Find PDAs
    [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), admin.publicKey.toBuffer()],
      program.programId
    );

    [employerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("employer"), employer.publicKey.toBuffer()],
      program.programId
    );

    // Initialize admin
    try {
      await program.methods
        .initializeAdmin()
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Whitelist employer
    try {
      await program.methods
        .whitelistEmployer(
          employer.publicKey,
          "Test Employer",
          "Test Company"
        )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          employerAccount: employerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }
  });

  it("Should create projects for developer, designer, and content writer", async () => {
    // Create Developer Project
    const devProjectId = new anchor.BN(1);
    const [devProjectPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        employer.publicKey.toBuffer(),
        devProjectId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    
    const [devProjectDetailsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("project_details"), devProjectPDA.toBuffer()],
      program.programId
    );

    const [devEscrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), devProjectPDA.toBuffer()],
      program.programId
    );

    const devVaultPDA = await getAssociatedTokenAddress(
      tokenMint,
      devEscrowPDA,
      true
    );

    // Initialize developer project
    await program.methods
      .initializeProject(
        devProjectId,
        "Developer Project",
        projectBudget
      )
      .accounts({
        employer: employer.publicKey,
        tokenMint,
        tokenAta: employerATA,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        project: devProjectPDA,
        escrow: devEscrowPDA,
        vault: devVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Add developer project details
    await program.methods
      .addProjectDetails(
        "Developer project description",
        { developer: {} },
        new anchor.BN(futureDeadline)
      )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: devProjectPDA,
        projectDetails: devProjectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Create Designer Project
    const designerProjectId = new anchor.BN(2);
    const [designerProjectPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        employer.publicKey.toBuffer(),
        designerProjectId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    
    const [designerProjectDetailsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("project_details"), designerProjectPDA.toBuffer()],
      program.programId
    );

    const [designerEscrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), designerProjectPDA.toBuffer()],
      program.programId
    );

    const designerVaultPDA = await getAssociatedTokenAddress(
      tokenMint,
      designerEscrowPDA,
      true
    );

    // Initialize designer project
    await program.methods
      .initializeProject(
        designerProjectId,
        "Designer Project",
        projectBudget
      )
      .accounts({
        employer: employer.publicKey,
        tokenMint,
        tokenAta: employerATA,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        project: designerProjectPDA,
        escrow: designerEscrowPDA,
        vault: designerVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Add designer project details
    await program.methods
      .addProjectDetails(
        "Designer project description",
        { designer: {} },
        new anchor.BN(futureDeadline)
      )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: designerProjectPDA,
        projectDetails: designerProjectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Create Content Writer Project
    const writerProjectId = new anchor.BN(3);
    const [writerProjectPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        employer.publicKey.toBuffer(),
        writerProjectId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    
    const [writerProjectDetailsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("project_details"), writerProjectPDA.toBuffer()],
      program.programId
    );

    const [writerEscrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), writerProjectPDA.toBuffer()],
      program.programId
    );

    const writerVaultPDA = await getAssociatedTokenAddress(
      tokenMint,
      writerEscrowPDA,
      true
    );

    // Initialize content writer project
    await program.methods
      .initializeProject(
        writerProjectId,
        "Content Writer Project",
        projectBudget
      )
      .accounts({
        employer: employer.publicKey,
        tokenMint,
        tokenAta: employerATA,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        project: writerProjectPDA,
        escrow: writerEscrowPDA,
        vault: writerVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Add content writer project details
    await program.methods
      .addProjectDetails(
        "Content writer project description",
        { contentWriter: {} },
        new anchor.BN(futureDeadline)
      )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: writerProjectPDA,
        projectDetails: writerProjectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Verify all project details
    const devDetails = await program.account.projectDetails.fetch(devProjectDetailsPDA);
    expect(devDetails.requirements).to.deep.equal({ developer: {} });
    expect(devDetails.description).to.equal("Developer project description");

    const designerDetails = await program.account.projectDetails.fetch(designerProjectDetailsPDA);
    expect(designerDetails.requirements).to.deep.equal({ designer: {} });
    expect(designerDetails.description).to.equal("Designer project description");

    const writerDetails = await program.account.projectDetails.fetch(writerProjectDetailsPDA);
    expect(writerDetails.requirements).to.deep.equal({ contentWriter: {} });
    expect(writerDetails.description).to.equal("Content writer project description");
  });
});
describe("Extended Project Details Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Capstone as Program<Capstone>;
  
  // Test accounts
  const admin = Keypair.generate();
  const employer = Keypair.generate();
  const unauthorizedUser = Keypair.generate();
  let tokenMint: PublicKey;
  let employerATA: PublicKey;
  
  // PDAs
  let adminPDA: PublicKey;
  let employerPDA: PublicKey;
  let projectPDA: PublicKey;
  let projectDetailsPDA: PublicKey;
  let escrowPDA: PublicKey;
  let vaultPDA: PublicKey;
  let projectId: anchor.BN;
  
  const projectBudget = new anchor.BN(1000);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const futureDeadline = currentTimestamp + 86400; // 24 hours from now

  beforeEach(async () => {
    projectId = new anchor.BN(Math.floor(Math.random() * 1000000)); // Random project ID for each test
    
    // Airdrop SOL for transaction fees
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(employer.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(unauthorizedUser.publicKey, LAMPORTS_PER_SOL)
    ]);
    
    await Promise.all(signatures.map(sig => provider.connection.confirmTransaction(sig)));

    // Setup token infrastructure
    tokenMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    employerATA = await createAccount(provider.connection, employer, tokenMint, employer.publicKey);
    await mintTo(provider.connection, employer, tokenMint, employerATA, admin, 2000);

    // Find PDAs
    [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), admin.publicKey.toBuffer()],
      program.programId
    );

    [employerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("employer"), employer.publicKey.toBuffer()],
      program.programId
    );

    [projectPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        employer.publicKey.toBuffer(),
        projectId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    [projectDetailsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("project_details"), projectPDA.toBuffer()],
      program.programId
    );

    [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), projectPDA.toBuffer()],
      program.programId
    );

    vaultPDA = await getAssociatedTokenAddress(tokenMint, escrowPDA, true);

    // Initialize admin and whitelist employer
    try {
      await program.methods
        .initializeAdmin()
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      await program.methods
        .whitelistEmployer(employer.publicKey, "Test Employer", "Test Company")
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          employerAccount: employerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Initialize base project for each test
    await program.methods
      .initializeProject(projectId, "Test Project", projectBudget)
      .accounts({
        employer: employer.publicKey,
        tokenMint,
        tokenAta: employerATA,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        project: projectPDA,
        escrow: escrowPDA,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();
  });

  it("Should handle maximum length description within transaction limits", async () => {
    const maxDescription = "x".repeat(500);
    
    await program.methods
      .addProjectDetails(
        maxDescription,
        { developer: {} },
        new anchor.BN(futureDeadline)
      )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const details = await program.account.projectDetails.fetch(projectDetailsPDA);
    expect(details.description.length).to.equal(500);
  });

  it("Should fail for description exceeding maximum length", async () => {
    const tooLongDescription = "x".repeat(1001);
    
    try {
      await program.methods
        .addProjectDetails(
          tooLongDescription,
          { developer: {} },
          new anchor.BN(futureDeadline)
        )
        .accounts({
          employer: employer.publicKey,
          employerAccount: employerPDA,
          project: projectPDA,
          projectDetails: projectDetailsPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      const errorString = error.toString();
      expect(
        errorString.includes("encoding overruns Buffer") ||
        errorString.includes("DescriptionTooLong")
      ).to.be.true;
    }
  });

  it("Should handle deadline in the future", async () => {
    const minValidDeadline = new anchor.BN(currentTimestamp + 3600);
    
    await program.methods
      .addProjectDetails(
        "Test description",
        { developer: {} },
        minValidDeadline
      )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const details = await program.account.projectDetails.fetch(projectDetailsPDA);
    expect(details.deadline.toString()).to.equal(minValidDeadline.toString());
  });

  it("Should fail for deadline in the past", async () => {
    const pastDeadline = new anchor.BN(currentTimestamp - 1);
    
    try {
      await program.methods
        .addProjectDetails(
          "Test description",
          { developer: {} },
          pastDeadline
        )
        .accounts({
          employer: employer.publicKey,
          employerAccount: employerPDA,
          project: projectPDA,
          projectDetails: projectDetailsPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("InvalidDeadline");
    }
  });

  it("Should fail when unauthorized user tries to add project details", async () => {
    try {
      const [unauthorizedEmployerPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("employer"), unauthorizedUser.publicKey.toBuffer()],
        program.programId
      );
      await program.methods
      .whitelistEmployer(
        unauthorizedUser.publicKey,
        "Unauthorized",
        "Test Company"
      )
      .accounts({
        admin: admin.publicKey,
        adminConfig: adminPDA,
        employerAccount: unauthorizedEmployerPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();
      await program.methods
        .addProjectDetails(
          "Test description",
          { developer: {} },
          new anchor.BN(futureDeadline)
        )
        .accounts({
          employer: unauthorizedUser.publicKey,
          employerAccount: unauthorizedEmployerPDA,
          project: projectPDA,
          projectDetails: projectDetailsPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([unauthorizedUser])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("UnauthorizedEmployer");
    }
  });

  it("Should maintain correct project reference", async () => {
    await program.methods
      .addProjectDetails(
        "Test description",
        { developer: {} },
        new anchor.BN(futureDeadline)
      )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const details = await program.account.projectDetails.fetch(projectDetailsPDA);
    expect(details.project.toString()).to.equal(projectPDA.toString());
  });

  it("Should initialize with null assigned freelancer", async () => {
    await program.methods
      .addProjectDetails(
        "Test description",
        { developer: {} },
        new anchor.BN(futureDeadline)
      )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const details = await program.account.projectDetails.fetch(projectDetailsPDA);
    expect(details.assignedFreelancer).to.be.null;
  });

  it("Should handle special characters in description", async () => {
    const specialDescription = "Test description with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?`~";
    
    await program.methods
      .addProjectDetails(
        specialDescription,
        { developer: {} },
        new anchor.BN(futureDeadline)
      )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const details = await program.account.projectDetails.fetch(projectDetailsPDA);
    expect(details.description).to.equal(specialDescription);
  });

  it("Should handle Unicode characters in description", async () => {
    const unicodeDescription = "Test with Unicode: 你好世界 🌍 привет мир";
    
    await program.methods
      .addProjectDetails(
        unicodeDescription,
        { developer: {} },
        new anchor.BN(futureDeadline)
      )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const details = await program.account.projectDetails.fetch(projectDetailsPDA);
    expect(details.description).to.equal(unicodeDescription);
  });
});
describe("Task Addition Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Capstone as Program<Capstone>;
  
  // Test accounts
  const admin = Keypair.generate();
  const employer = Keypair.generate();
  let tokenMint: PublicKey;
  let employerATA: PublicKey;
  
  // PDAs
  let adminPDA: PublicKey;
  let employerPDA: PublicKey;
  let projectPDA: PublicKey;
  let projectDetailsPDA: PublicKey;
  let taskPDA: PublicKey;
  let escrowPDA: PublicKey;
  let vaultPDA: PublicKey;
  let projectId: anchor.BN;
  
  const projectBudget = new anchor.BN(1000);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const futureDeadline = currentTimestamp + 86400; // 24 hours from now

  beforeEach(async () => {
    projectId = new anchor.BN(Math.floor(Math.random() * 1000000));

    // Airdrop SOL for transaction fees
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(employer.publicKey, 2 * LAMPORTS_PER_SOL)
    ]);
    
    await Promise.all(signatures.map(sig => provider.connection.confirmTransaction(sig)));

    // Create token mint and accounts
    tokenMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    employerATA = await createAccount(provider.connection, employer, tokenMint, employer.publicKey);
    await mintTo(provider.connection, employer, tokenMint, employerATA, admin, 2000);

    // Find PDAs
    [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), admin.publicKey.toBuffer()],
      program.programId
    );

    [employerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("employer"), employer.publicKey.toBuffer()],
      program.programId
    );

    [projectPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        employer.publicKey.toBuffer(),
        projectId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    [projectDetailsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("project_details"), projectPDA.toBuffer()],
      program.programId
    );

    [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), projectPDA.toBuffer()],
      program.programId
    );

    vaultPDA = await getAssociatedTokenAddress(tokenMint, escrowPDA, true);

    // Setup initial state
    try {
      await program.methods.initializeAdmin()
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Whitelist employer
    try {
      await program.methods.whitelistEmployer(
        employer.publicKey,
        "Test Employer",
        "Test Company"
      )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          employerAccount: employerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Initialize project and add project details
    await program.methods.initializeProject(
      projectId,
      "Test Project",
      projectBudget
    )
      .accounts({
        employer: employer.publicKey,
        tokenMint,
        tokenAta: employerATA,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        project: projectPDA,
        escrow: escrowPDA,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Add project details
    await program.methods.addProjectDetails(
      "Test Project Description",
      { developer: {} },
      new anchor.BN(futureDeadline)
    )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();
  });

  it("Should successfully add a task with valid parameters", async () => {
    const taskNumber = new anchor.BN(1);
    [taskPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        projectPDA.toBuffer(),
        taskNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    await program.methods.addTask(
      taskNumber,
      "Test Task",
      "Test Description",
      new anchor.BN(500)
    )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        task: taskPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const task = await program.account.task.fetch(taskPDA);
    expect(task.title).to.equal("Test Task");
    expect(task.description).to.equal("Test Description");
    expect(task.budget.toString()).to.equal("500");
    expect(task.status).to.deep.equal({ open: {} });
  });

  it("Should fail when task title exceeds maximum length", async () => {
    const taskNumber = new anchor.BN(2);
    [taskPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        projectPDA.toBuffer(),
        taskNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    try {
      await program.methods.addTask(
        taskNumber,
        "x".repeat(101),
        "Test Description",
        new anchor.BN(500)
      )
        .accounts({
          employer: employer.publicKey,
          employerAccount: employerPDA,
          project: projectPDA,
          task: taskPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("TitleTooLong");
    }
  });

  it("Should fail when task description exceeds maximum length", async () => {
    const taskNumber = new anchor.BN(3);
    [taskPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        projectPDA.toBuffer(),
        taskNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    try {
      await program.methods.addTask(
        taskNumber,
        "Test Task",
        "x".repeat(501),
        new anchor.BN(500)
      )
        .accounts({
          employer: employer.publicKey,
          employerAccount: employerPDA,
          project: projectPDA,
          task: taskPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("DescriptionTooLong");
    }
  });

  it("Should fail when task budget exceeds remaining project budget", async () => {
    const taskNumber = new anchor.BN(4);
    [taskPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        projectPDA.toBuffer(),
        taskNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    try {
      await program.methods.addTask(
        taskNumber,
        "Test Task",
        "Test Description",
        new anchor.BN(1500)
      )
        .accounts({
          employer: employer.publicKey,
          employerAccount: employerPDA,
          project: projectPDA,
          task: taskPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([employer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("InvalidBudget");
    }
  });

  it("Should update project remaining budget after adding task", async () => {
    const taskNumber = new anchor.BN(5);
    const taskBudget = new anchor.BN(500);
    
    [taskPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        projectPDA.toBuffer(),
        taskNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    const projectBefore = await program.account.project.fetch(projectPDA);

    await program.methods.addTask(
      taskNumber,
      "Test Task",
      "Test Description",
      taskBudget
    )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        task: taskPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const projectAfter = await program.account.project.fetch(projectPDA);
    expect(projectAfter.remainingBudget.toString()).to.equal(
      projectBefore.remainingBudget.sub(taskBudget).toString()
    );
  });

  it("Should increment project task count after adding task", async () => {
    const taskNumber = new anchor.BN(6);
    [taskPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        projectPDA.toBuffer(),
        taskNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    const projectBefore = await program.account.project.fetch(projectPDA);
    const initialTaskCount = projectBefore.tasksCount;

    await program.methods.addTask(
      taskNumber,
      "Test Task",
      "Test Description",
      new anchor.BN(500)
    )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        task: taskPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const projectAfter = await program.account.project.fetch(projectPDA);
    expect(projectAfter.tasksCount).to.equal(initialTaskCount + 1);
  });

  it("Should initialize task with correct default values", async () => {
    const taskNumber = new anchor.BN(7);
    [taskPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        projectPDA.toBuffer(),
        taskNumber.toBuffer('le', 8)
      ],
      program.programId
    );

    await program.methods.addTask(
      taskNumber,
      "Test Task",
      "Test Description",
      new anchor.BN(500)
    )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        task: taskPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    const task = await program.account.task.fetch(taskPDA);
    expect(task.status).to.deep.equal({ open: {} });
    expect(task.assignedFreelancer).to.be.null;
    expect(task.completedAt).to.be.null;
    expect(task.project.toString()).to.equal(projectPDA.toString());
  });
});
describe("Accept Project Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Capstone as Program<Capstone>;
  
  // Test accounts
  const admin = Keypair.generate();
  const employer = Keypair.generate();
  const freelancer = Keypair.generate();
  const anotherFreelancer = Keypair.generate();
  let tokenMint: PublicKey;
  let employerATA: PublicKey;
  
  // PDAs
  let adminPDA: PublicKey;
  let employerPDA: PublicKey;
  let freelancerPDA: PublicKey;
  let anotherFreelancerPDA: PublicKey;
  let projectPDA: PublicKey;
  let projectDetailsPDA: PublicKey;
  let escrowPDA: PublicKey;
  let vaultPDA: PublicKey;
  let projectId: anchor.BN;
  
  const projectBudget = new anchor.BN(1000);
  const futureDeadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

  beforeEach(async () => {
    projectId = new anchor.BN(Math.floor(Math.random() * 1000000));

    // Airdrop SOL for transaction fees
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(employer.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(freelancer.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(anotherFreelancer.publicKey, 2 * LAMPORTS_PER_SOL)
    ]);
    
    await Promise.all(signatures.map(sig => provider.connection.confirmTransaction(sig)));

    // Setup token infrastructure
    tokenMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    employerATA = await createAccount(provider.connection, employer, tokenMint, employer.publicKey);
    await mintTo(provider.connection, employer, tokenMint, employerATA, admin, 2000);

    // Find PDAs
    [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), admin.publicKey.toBuffer()],
      program.programId
    );

    [employerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("employer"), employer.publicKey.toBuffer()],
      program.programId
    );

    [freelancerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer"), freelancer.publicKey.toBuffer()],
      program.programId
    );

    [anotherFreelancerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer"), anotherFreelancer.publicKey.toBuffer()],
      program.programId
    );

    [projectPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        employer.publicKey.toBuffer(),
        projectId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    [projectDetailsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("project_details"), projectPDA.toBuffer()],
      program.programId
    );

    [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), projectPDA.toBuffer()],
      program.programId
    );

    vaultPDA = await getAssociatedTokenAddress(tokenMint, escrowPDA, true);

    // Initialize admin
    try {
      await program.methods
        .initializeAdmin()
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Whitelist employer and freelancer
    try {
      await program.methods
        .whitelistEmployer(
          employer.publicKey,
          "Test Employer",
          "Test Company"
        )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          employerAccount: employerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      await program.methods
        .whitelistFreelancer(
          freelancer.publicKey,
          "Test Freelancer",
          { developer: {} }
        )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          freelancerAccount: freelancerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      await program.methods
        .whitelistFreelancer(
          anotherFreelancer.publicKey,
          "Another Freelancer",
          { designer: {} }
        )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          freelancerAccount: anotherFreelancerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Initialize project with details
    await program.methods
      .initializeProject(
        projectId,
        "Test Project",
        projectBudget
      )
      .accounts({
        employer: employer.publicKey,
        tokenMint,
        tokenAta: employerATA,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        project: projectPDA,
        escrow: escrowPDA,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    await program.methods
      .addProjectDetails(
        "Test Project Description",
        { developer: {} },  // Set requirement as developer
        new anchor.BN(futureDeadline)
      )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();
  });

  it("Should successfully accept project when freelancer profession matches requirement", async () => {
    await program.methods
      .acceptProject()
      .accounts({
        freelancer: freelancer.publicKey,
        freelancerAccount: freelancerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
      })
      .signers([freelancer])
      .rpc();

    const projectAfter = await program.account.project.fetch(projectPDA);
    const projectDetailsAfter = await program.account.projectDetails.fetch(projectDetailsPDA);

    expect(projectAfter.projectStatus).to.deep.equal({ inProgress: {} });
    expect(projectDetailsAfter.assignedFreelancer.toString()).to.equal(freelancer.publicKey.toString());
  });

  it("Should fail when freelancer profession doesn't match project requirements", async () => {
    try {
      // Designer trying to accept a developer project
      await program.methods
        .acceptProject()
        .accounts({
          freelancer: anotherFreelancer.publicKey,
          freelancerAccount: anotherFreelancerPDA,
          project: projectPDA,
          projectDetails: projectDetailsPDA,
        })
        .signers([anotherFreelancer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("ProfessionMismatch");
    }
  });

  it("Should fail when project is already assigned to another freelancer", async () => {
    const thirdFreelancer = Keypair.generate();
    const [thirdFreelancerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer"), thirdFreelancer.publicKey.toBuffer()],
      program.programId
    );

    // Airdrop SOL to the new freelancer
    const signature = await provider.connection.requestAirdrop(
      thirdFreelancer.publicKey, 
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);
    
    // Whitelist the new freelancer
    await program.methods
      .whitelistFreelancer(
        thirdFreelancer.publicKey,
        "Third Freelancer",
        { developer: {} }
      )
      .accounts({
        admin: admin.publicKey,
        adminConfig: adminPDA,
        freelancerAccount: thirdFreelancerPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    // First freelancer accepts the project
    await program.methods
      .acceptProject()
      .accounts({
        freelancer: freelancer.publicKey,
        freelancerAccount: freelancerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
      })
      .signers([freelancer])
      .rpc();

    // Verify the project was assigned to the first freelancer
    const projectDetails = await program.account.projectDetails.fetch(projectDetailsPDA);
    expect(projectDetails.assignedFreelancer.toString()).to.equal(freelancer.publicKey.toString());

    try {
      // Second freelancer tries to accept the same project
      await program.methods
        .acceptProject()
        .accounts({
          freelancer: thirdFreelancer.publicKey,
          freelancerAccount: thirdFreelancerPDA,
          project: projectPDA,
          projectDetails: projectDetailsPDA,
        })
        .signers([thirdFreelancer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      const project = await program.account.project.fetch(projectPDA);
      console.log("Project status:", project.projectStatus);
      console.log("Error code:", error.error.errorCode.code);
      expect(error.error.errorCode.code).to.equal("ProjectAlreadyAssigned");
    }
  });

  it("Should fail when trying to accept a completed project", async () => {
    // First, accept the project normally
    await program.methods
      .acceptProject()
      .accounts({
        freelancer: freelancer.publicKey,
        freelancerAccount: freelancerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
      })
      .signers([freelancer])
      .rpc();

    try {
      // Try to accept a completed project
      await program.methods
        .acceptProject()
        .accounts({
          freelancer: freelancer.publicKey,
          freelancerAccount: freelancerPDA,
          project: projectPDA,
          projectDetails: projectDetailsPDA,
        })
        .signers([freelancer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("ProjectAlreadyAssigned");
    }
  });

  it("Should fail when freelancer is not whitelisted", async () => {
    const nonWhitelistedFreelancer = Keypair.generate();
    const [nonWhitelistedPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer"), nonWhitelistedFreelancer.publicKey.toBuffer()],
      program.programId
    );

    // Airdrop SOL to the non-whitelisted freelancer
    const signature = await provider.connection.requestAirdrop(
      nonWhitelistedFreelancer.publicKey, 
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    // Initialize the freelancer account but set is_whitelisted to false
    await program.methods
      .whitelistFreelancer(
        nonWhitelistedFreelancer.publicKey,
        "Non Whitelisted",
        { developer: {} }
      )
      .accounts({
        admin: admin.publicKey,
        adminConfig: adminPDA,
        freelancerAccount: nonWhitelistedPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    // Remove from whitelist
    await program.methods
      .removeFreelancer(nonWhitelistedFreelancer.publicKey)
      .accounts({
        admin: admin.publicKey,
        adminConfig: adminPDA,
        freelancerAccount: nonWhitelistedPDA,
      })
      .signers([admin])
      .rpc();

    try {
      await program.methods
        .acceptProject()
        .accounts({
          freelancer: nonWhitelistedFreelancer.publicKey,
          freelancerAccount: nonWhitelistedPDA,
          project: projectPDA,
          projectDetails: projectDetailsPDA,
        })
        .signers([nonWhitelistedFreelancer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("UnauthorizedFreelancer");
    }
  });
});
describe("Submit Task Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Capstone as Program<Capstone>;
  
  // Test accounts
  const admin = Keypair.generate();
  const employer = Keypair.generate();
  const freelancer = Keypair.generate();
  let tokenMint: PublicKey;
  let employerATA: PublicKey;
  
  // PDAs
  let adminPDA: PublicKey;
  let employerPDA: PublicKey;
  let freelancerPDA: PublicKey;
  let projectPDA: PublicKey;
  let projectDetailsPDA: PublicKey;
  let taskPDA: PublicKey;
  let submissionPDA: PublicKey;
  let escrowPDA: PublicKey;
  let vaultPDA: PublicKey;
  let projectId: anchor.BN;
  let taskId: anchor.BN;
  
  const projectBudget = new anchor.BN(1000);
  const taskBudget = new anchor.BN(500);

  beforeEach(async () => {
    projectId = new anchor.BN(Math.floor(Math.random() * 1000000));
    taskId = new anchor.BN(1);

    // Airdrop SOL for transaction fees
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(employer.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(freelancer.publicKey, 2 * LAMPORTS_PER_SOL)
    ]);
    
    await Promise.all(signatures.map(sig => provider.connection.confirmTransaction(sig)));

    // Create token mint and accounts
    tokenMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    employerATA = await createAccount(provider.connection, employer, tokenMint, employer.publicKey);
    await mintTo(provider.connection, employer, tokenMint, employerATA, admin, 2000);

    // Find PDAs
    [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), admin.publicKey.toBuffer()],
      program.programId
    );

    [employerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("employer"), employer.publicKey.toBuffer()],
      program.programId
    );

    [freelancerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer"), freelancer.publicKey.toBuffer()],
      program.programId
    );

    [projectPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        employer.publicKey.toBuffer(),
        projectId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    [projectDetailsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("project_details"), projectPDA.toBuffer()],
      program.programId
    );

    [taskPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        projectPDA.toBuffer(),
        taskId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), projectPDA.toBuffer()],
      program.programId
    );

    vaultPDA = await getAssociatedTokenAddress(tokenMint, escrowPDA, true);

    // Initialize admin if not already initialized
    try {
      await program.methods.initializeAdmin()
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      // Ignore if admin already initialized
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Try to whitelist employer
    try {
      await program.methods.whitelistEmployer(
        employer.publicKey,
        "Test Employer",
        "Test Company"
      )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          employerAccount: employerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      // Check if error is because account is already whitelisted
      const errorMessage = error.toString();
      if (!errorMessage.includes("already in use") && !errorMessage.includes("AlreadyWhitelisted")) {
        throw error;
      }
    }

    // Try to whitelist freelancer
    try {
      await program.methods.whitelistFreelancer(
        freelancer.publicKey,
        "Test Freelancer",
        { developer: {} }
      )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          freelancerAccount: freelancerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      // Check if error is because account is already whitelisted
      const errorMessage = error.toString();
      if (!errorMessage.includes("already in use") && !errorMessage.includes("AlreadyWhitelisted")) {
        throw error;
      }
    }

    // Initialize project and add task
    await program.methods.initializeProject(
      projectId,
      "Test Project",
      projectBudget
    )
      .accounts({
        employer: employer.publicKey,
        tokenMint,
        tokenAta: employerATA,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        project: projectPDA,
        escrow: escrowPDA,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    await program.methods.addProjectDetails(
      "Test Description",
      { developer: {} },
      new anchor.BN(Math.floor(Date.now() / 1000) + 86400)
    )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    await program.methods.addTask(
      taskId,
      "Test Task",
      "Test Description",
      taskBudget
    )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        task: taskPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Accept project
    await program.methods.acceptProject()
      .accounts({
        freelancer: freelancer.publicKey,
        freelancerAccount: freelancerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
      })
      .signers([freelancer])
      .rpc();
  });

  it("Should successfully submit task with valid parameters", async () => {
    const taskBefore = await program.account.task.fetch(taskPDA);
    const initialCounter = taskBefore.submissionCounter;

    const [submissionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("submission"),
        freelancer.publicKey.toBuffer(),
        taskPDA.toBuffer(),
        initialCounter.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    await program.methods.submitTask(
      "Task submission description",
      { unitTests: {} },
      "https://github.com/test/proof"
    )
      .accounts({
        freelancer: freelancer.publicKey,
        freelancerAccount: freelancerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        task: taskPDA,
        submission: submissionPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();

    const submission = await program.account.taskSubmission.fetch(submissionPDA);
    const task = await program.account.task.fetch(taskPDA);

    expect(submission.description).to.equal("Task submission description");
    expect(submission.proofOfWork).to.equal("https://github.com/test/proof");
    expect(submission.pocType).to.deep.equal({ unitTests: {} });
    expect(task.status).to.deep.equal({ inReview: {} });
    expect(task.assignedFreelancer.toString()).to.equal(freelancer.publicKey.toString());
  });

  it("Should fail when POC type doesn't match freelancer profession", async () => {
    const taskBefore = await program.account.task.fetch(taskPDA);
    const counter = taskBefore.submissionCounter;
    
    const [submissionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("submission"),
        freelancer.publicKey.toBuffer(),
        taskPDA.toBuffer(),
        counter.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    try {
      // Developer trying to submit design work
      await program.methods.submitTask(
        "Task submission description",
        { designLink: {} },  // Wrong POC type for a developer
        "https://figma.com/design"
      )
        .accounts({
          freelancer: freelancer.publicKey,
          freelancerAccount: freelancerPDA,
          project: projectPDA,
          projectDetails: projectDetailsPDA,
          task: taskPDA,
          submission: submissionPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([freelancer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("InvalidPocType");
    }
  });

  it("Should fail when description is too long", async () => {
    const taskBefore = await program.account.task.fetch(taskPDA);
    const counter = taskBefore.submissionCounter;
    
    const [submissionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("submission"),
        freelancer.publicKey.toBuffer(),
        taskPDA.toBuffer(),
        counter.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    try {
      await program.methods.submitTask(
        "x".repeat(1001),  // Description longer than 1000 characters
        { unitTests: {} },
        "https://github.com/test/proof"
      )
        .accounts({
          freelancer: freelancer.publicKey,
          freelancerAccount: freelancerPDA,
          project: projectPDA,
          projectDetails: projectDetailsPDA,
          task: taskPDA,
          submission: submissionPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([freelancer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      const errorString = error.toString();
      expect(
        errorString.includes("encoding overruns Buffer") ||
        errorString.includes("DescriptionTooLong")
      ).to.be.true;
    }
  });

  it("Should fail when proof of work link is too long", async () => {
    const taskBefore = await program.account.task.fetch(taskPDA);
    const counter = taskBefore.submissionCounter;
    
    const [submissionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("submission"),
        freelancer.publicKey.toBuffer(),
        taskPDA.toBuffer(),
        counter.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    try {
      await program.methods.submitTask(
        "Valid description",
        { unitTests: {} },
        "x".repeat(101)  // Proof of work longer than 100 characters
      )
        .accounts({
          freelancer: freelancer.publicKey,
          freelancerAccount: freelancerPDA,
          project: projectPDA,
          projectDetails: projectDetailsPDA,
          task: taskPDA,
          submission: submissionPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([freelancer])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("ProofOfWorkTooLong");
    }
  });
  
});
describe("Freelancer Overview Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Capstone as Program<Capstone>;
  
  // Test accounts
  const admin = Keypair.generate();
  const freelancer = Keypair.generate();
  
  // PDAs
  let adminPDA: PublicKey;
  let freelancerPDA: PublicKey;
  let freelancerOverviewPDA: PublicKey;
  
  beforeEach(async () => {
    // Airdrop SOL for transaction fees
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(freelancer.publicKey, LAMPORTS_PER_SOL)
    ]);
    
    await Promise.all(signatures.map(sig => provider.connection.confirmTransaction(sig)));

    // Find PDAs
    [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), admin.publicKey.toBuffer()],
      program.programId
    );

    [freelancerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer"), freelancer.publicKey.toBuffer()],
      program.programId
    );

    [freelancerOverviewPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer_overview"), freelancer.publicKey.toBuffer()],
      program.programId
    );

    // Initialize admin
    try {
      await program.methods
        .initializeAdmin()
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Whitelist freelancer
    try {
      await program.methods
        .whitelistFreelancer(
          freelancer.publicKey,
          "Test Freelancer",
          { developer: {} }
        )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          freelancerAccount: freelancerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }
  });

  it("Should initialize freelancer overview with default values", async () => {
    // Try to initialize freelancer overview
    try {
      await program.methods
        .initializeFreelancerOverview(freelancer.publicKey)
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          freelancerAccount: freelancerPDA,
          freelancerOverview: freelancerOverviewPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      // If error is not about account already in use, throw it
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    const overview = await program.account.freelancerOverview.fetch(freelancerOverviewPDA);
    expect(overview.freelancer.toString()).to.equal(freelancer.publicKey.toString());
    expect(overview.totalProjectsCompleted.toString()).to.equal("0");
    expect(overview.averageRating).to.equal(0);
    expect(overview.ratingStats.oneStar.toString()).to.equal("0");
    expect(overview.ratingStats.twoStar.toString()).to.equal("0");
    expect(overview.ratingStats.threeStar.toString()).to.equal("0");
    expect(overview.ratingStats.fourStar.toString()).to.equal("0");
    expect(overview.ratingStats.fiveStar.toString()).to.equal("0");
  });

  it("Should fail when initializing overview for non-existent freelancer", async () => {
    const invalidFreelancer = Keypair.generate();
    const [invalidFreelancerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer"), invalidFreelancer.publicKey.toBuffer()],
      program.programId
    );

    const [invalidOverviewPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer_overview"), invalidFreelancer.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initializeFreelancerOverview(invalidFreelancer.publicKey)
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          freelancerAccount: invalidFreelancerPDA,
          freelancerOverview: invalidOverviewPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
      
      expect.fail("Expected the transaction to fail");
    } catch (error) {
      expect(error.toString()).to.include("AccountNotInitialized");
    }
  });

  it("Should maintain overview data integrity after initialization", async () => {
    // First, check if the overview already exists
    try {
      await program.account.freelancerOverview.fetch(freelancerOverviewPDA);
    } catch (error) {
      // If account doesn't exist, initialize it
      if (error.toString().includes("Account does not exist")) {
        await program.methods
          .initializeFreelancerOverview(freelancer.publicKey)
          .accounts({
            admin: admin.publicKey,
            adminConfig: adminPDA,
            freelancerAccount: freelancerPDA,
            freelancerOverview: freelancerOverviewPDA,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin])
          .rpc();
      } else {
        throw error;
      }
    }

    const overview = await program.account.freelancerOverview.fetch(freelancerOverviewPDA);
    
    // Verify the overview maintains correct references and structure
    expect(overview.freelancer.toString()).to.equal(freelancer.publicKey.toString());
    expect(typeof overview.totalProjectsCompleted.toString()).to.equal('string'); // BN toString()
    expect(typeof overview.averageRating).to.equal('number');
    expect(overview.ratingStats).to.have.all.keys([
      'oneStar',
      'twoStar',
      'threeStar',
      'fourStar',
      'fiveStar'
    ]);
  });

});
describe("Task Review and Rating Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Capstone as Program<Capstone>;
  
  // Test accounts
  const admin = Keypair.generate();
  const employer = Keypair.generate();
  const freelancer = Keypair.generate();
  let tokenMint: PublicKey;
  let employerATA: PublicKey;
  let freelancerATA: PublicKey;
  
  // PDAs
  let adminPDA: PublicKey;
  let employerPDA: PublicKey;
  let freelancerPDA: PublicKey;
  let projectPDA: PublicKey;
  let projectDetailsPDA: PublicKey;
  let taskPDA: PublicKey;
  let submissionPDA: PublicKey;
  let escrowPDA: PublicKey;
  let vaultPDA: PublicKey;
  let freelancerOverviewPDA: PublicKey;
  let ratingPDA: PublicKey;
  let projectId: anchor.BN;
  let taskId: anchor.BN;
  
  const projectBudget = new anchor.BN(1000);
  const taskBudget = new anchor.BN(500);

  beforeEach(async () => {
    projectId = new anchor.BN(Math.floor(Math.random() * 1000000));
    taskId = new anchor.BN(1);

    // Airdrop SOL for transaction fees
    const signatures = await Promise.all([
      provider.connection.requestAirdrop(admin.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(employer.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(freelancer.publicKey, 2 * LAMPORTS_PER_SOL)
    ]);
    
    await Promise.all(signatures.map(sig => provider.connection.confirmTransaction(sig)));

    // Create token mint and accounts
    tokenMint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    employerATA = await createAccount(provider.connection, employer, tokenMint, employer.publicKey);
    await mintTo(provider.connection, employer, tokenMint, employerATA, admin, 2000);

    // Find PDAs
    [adminPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), admin.publicKey.toBuffer()],
      program.programId
    );

    [employerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("employer"), employer.publicKey.toBuffer()],
      program.programId
    );

    [freelancerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer"), freelancer.publicKey.toBuffer()],
      program.programId
    );

    [projectPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("project"),
        employer.publicKey.toBuffer(),
        projectId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    [projectDetailsPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("project_details"), projectPDA.toBuffer()],
      program.programId
    );

    [taskPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("task"),
        projectPDA.toBuffer(),
        taskId.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );

    [escrowPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), projectPDA.toBuffer()],
      program.programId
    );

    [freelancerOverviewPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("freelancer_overview"), freelancer.publicKey.toBuffer()],
      program.programId
    );

    [ratingPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("rating"),
        projectPDA.toBuffer(),
        freelancer.publicKey.toBuffer()
      ],
      program.programId
    );

    vaultPDA = await getAssociatedTokenAddress(tokenMint, escrowPDA, true);
    freelancerATA = await getAssociatedTokenAddress(tokenMint, freelancer.publicKey);

    // Initialize admin
    try {
      await program.methods.initializeAdmin()
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Setup employer and freelancer
    try {
      await program.methods.whitelistEmployer(
        employer.publicKey,
        "Test Employer",
        "Test Company"
      )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          employerAccount: employerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    try {
      await program.methods.whitelistFreelancer(
        freelancer.publicKey,
        "Test Freelancer",
        { developer: {} }
      )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          freelancerAccount: freelancerPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Initialize freelancer overview
    try {
      await program.methods.initializeFreelancerOverview(
        freelancer.publicKey
      )
        .accounts({
          admin: admin.publicKey,
          adminConfig: adminPDA,
          freelancerAccount: freelancerPDA,
          freelancerOverview: freelancerOverviewPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
    } catch (error) {
      if (!error.toString().includes("already in use")) {
        throw error;
      }
    }

    // Initialize project and setup task
    await program.methods.initializeProject(
      projectId,
      "Test Project",
      projectBudget
    )
      .accounts({
        employer: employer.publicKey,
        tokenMint,
        tokenAta: employerATA,
        adminConfig: adminPDA,
        employerAccount: employerPDA,
        project: projectPDA,
        escrow: escrowPDA,
        vault: vaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    await program.methods.addProjectDetails(
      "Test Description",
      { developer: {} },
      new anchor.BN(Math.floor(Date.now() / 1000) + 86400)
    )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    await program.methods.addTask(
      taskId,
      "Test Task",
      "Test Description",
      taskBudget
    )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        task: taskPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Accept project
    await program.methods.acceptProject()
      .accounts({
        freelancer: freelancer.publicKey,
        freelancerAccount: freelancerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
      })
      .signers([freelancer])
      .rpc();
  });

  it("Should successfully approve task submission and complete project", async () => {
    const taskBefore = await program.account.task.fetch(taskPDA);
    let counter = taskBefore.submissionCounter;

    [submissionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("submission"),
        freelancer.publicKey.toBuffer(),
        taskPDA.toBuffer(),
        counter.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    // Submit task
    await program.methods.submitTask(
      "Initial task submission",
      { unitTests: {} },
      "https://github.com/test/proof"
    )
      .accounts({
        freelancer: freelancer.publicKey,
        freelancerAccount: freelancerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        task: taskPDA,
        submission: submissionPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();

    // Approve task
    await program.methods.approveTask()
      .accounts({
        employer: employer.publicKey,
        freelancer: freelancer.publicKey,
        tokenMint,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        task: taskPDA,
        freelancerOverview: freelancerOverviewPDA,
        escrow: escrowPDA,
        vault: vaultPDA,
        freelancerTokenAccount: freelancerATA,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([employer])
      .rpc();

    // Verify task status and payment
    const task = await program.account.task.fetch(taskPDA);
    const freelancerAccount = await getAccount(provider.connection, freelancerATA);
    
    expect(task.status).to.deep.equal({ completed: {} });
    expect(freelancerAccount.amount.toString()).to.equal(taskBudget.toString());
  });

  it("Should handle task rejection, resubmission, approval, and rating workflow", async () => {
    const taskBefore = await program.account.task.fetch(taskPDA);
    let counter = taskBefore.submissionCounter;
    console.log("First counter:", counter);

    [submissionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("submission"),
        freelancer.publicKey.toBuffer(),
        taskPDA.toBuffer(),
        counter.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    // First submission
    await program.methods.submitTask(
      "Initial task submission",
      { unitTests: {} },
      "https://github.com/test/initial-proof"
    )
      .accounts({
        freelancer: freelancer.publicKey,
        freelancerAccount: freelancerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        task: taskPDA,
        submission: submissionPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();

    // Reject first submission
    await program.methods.rejectTask()
      .accounts({
        employer: employer.publicKey,
        freelancer: freelancer.publicKey,
        tokenMint,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        task: taskPDA,
        freelancerOverview: freelancerOverviewPDA,
        escrow: escrowPDA,
        vault: vaultPDA,
        freelancerTokenAccount: freelancerATA,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([employer])
      .rpc();

    let task = await program.account.task.fetch(taskPDA);
    counter = taskBefore.submissionCounter.addn(1);
    console.log("Second counter:", counter);

    [submissionPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("submission"),
        freelancer.publicKey.toBuffer(),
        taskPDA.toBuffer(),
        counter.toArrayLike(Buffer, 'le', 8)
      ],
      program.programId
    );
    expect(task.status).to.deep.equal({ rejected: {} });

    // Submit revised task
    await program.methods.submitTask(
      "Revised task submission",
      { unitTests: {} },
      "https://github.com/test/revised-proof"
    )
      .accounts({
        freelancer: freelancer.publicKey,
        freelancerAccount: freelancerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        task: taskPDA,
        submission: submissionPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([freelancer])
      .rpc();

    // Approve revised submission
    await program.methods.approveTask()
      .accounts({
        employer: employer.publicKey,
        freelancer: freelancer.publicKey,
        tokenMint,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        task: taskPDA,
        freelancerOverview: freelancerOverviewPDA,
        escrow: escrowPDA,
        vault: vaultPDA,
        freelancerTokenAccount: freelancerATA,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([employer])
      .rpc();

    task = await program.account.task.fetch(taskPDA);
    expect(task.status).to.deep.equal({ completed: {} });

    // Rate freelancer
    await program.methods.rateFreelancer(
      { four: {} },
      "Good work after revision"
    )
      .accounts({
        employer: employer.publicKey,
        employerAccount: employerPDA,
        project: projectPDA,
        projectDetails: projectDetailsPDA,
        freelancerAccount: freelancerPDA,
        freelancerOverview: freelancerOverviewPDA,
        rating: ratingPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([employer])
      .rpc();

    // Get and log updated freelancer overview
    const overview = await program.account.freelancerOverview.fetch(freelancerOverviewPDA);
    console.log("Updated Freelancer Overview:", {
      totalProjectsCompleted: overview.totalProjectsCompleted.toString(),
      averageRating: overview.averageRating,
      ratingStats: {
        oneStar: overview.ratingStats.oneStar.toString(),
        twoStar: overview.ratingStats.twoStar.toString(),
        threeStar: overview.ratingStats.threeStar.toString(),
        fourStar: overview.ratingStats.fourStar.toString(),
        fiveStar: overview.ratingStats.fiveStar.toString()
      }
    });

    // Verify the rating was recorded correctly
    const rating = await program.account.freelancerRating.fetch(ratingPDA);
    expect(rating.rating).to.deep.equal({ four: {} });
    expect(rating.feedback).to.equal("Good work after revision");
    expect(rating.freelancer.toString()).to.equal(freelancer.publicKey.toString());
    expect(rating.employer.toString()).to.equal(employer.publicKey.toString());

    // Verify freelancer overview was updated correctly
    console.log('total project completed');
    expect(overview.totalProjectsCompleted.toString()).to.equal("2");
    console.log('rating');
    expect(overview.ratingStats.fourStar.toString()).to.equal("1");
    expect(overview.averageRating).to.equal(4.0);
  });
});