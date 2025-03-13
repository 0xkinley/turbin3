'use client'

import { getEscrow2Program, getEscrow2ProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey, SystemProgram} from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'
import { BN } from '@coral-xyz/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'
//import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system'

export function useEscrow2Program() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getEscrow2ProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getEscrow2Program(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['escrow2', 'all', { cluster }],
    queryFn: () => program.account.escrow.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })
 // dummy: 7RaxRtYbvitybhn4LCjEHnXM1WQAFX8D941xYoXuZt24
 // halo: BY5JSqNfpZbjpSMRvtPaXB6hNJaTYXBr5kTkBurABNRk
  const initialize = useMutation({
    mutationKey: ['escrow2', 'initialize', { cluster }],
    mutationFn: async(keypair: Keypair) =>
      { const seed = new BN(1);
        const depositAmount = new BN(50);
        const mintA = new PublicKey("7RaxRtYbvitybhn4LCjEHnXM1WQAFX8D941xYoXuZt24");
        const mintB = new PublicKey("BY5JSqNfpZbjpSMRvtPaXB6hNJaTYXBr5kTkBurABNRk")
        const mintAtaA = await getAssociatedTokenAddress(
          mintA, 
          provider.publicKey,);
        
        const [escrow] = PublicKey.findProgramAddressSync(
              [Buffer.from("escrow"), provider.publicKey.toBuffer(), seed.toBuffer('le', 8)],
              program.programId
            );
        const vault = getAssociatedTokenAddressSync(
              mintA, 
              escrow,
              true
            );

        return await program.methods
              .makeOffer(seed, depositAmount)
              .accountsStrict({
                maker: provider.publicKey,
                mintA,
                mintB,
                vault,
                escrow,
                mintAtaA,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
              })
              .rpc()
      },
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to initialize account'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  }
}

export function useEscrow2ProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useEscrow2Program()
  const provider = useAnchorProvider()

  const accountQuery = useQuery({
    queryKey: ['escrow2', 'fetch', { cluster, account }],
    queryFn: () => program.account.escrow.fetch(account),
  })

  const vaultQuery = useQuery({
    queryKey: ['escrow2', 'fetch', { cluster, account }],
    queryFn: async() => {
      console.log("hey");
      const mintA = new PublicKey("7RaxRtYbvitybhn4LCjEHnXM1WQAFX8D941xYoXuZt24");

      const vault = getAssociatedTokenAddressSync(
        mintA, 
        account,
        true
      );

      console.log(vault.toBase58());

      const vaultAccount = await getAccount(provider.connection, vault)
      return vaultAccount
    },
  })

  

  

  

  

  return {
    accountQuery,
    vaultQuery
  }
}
