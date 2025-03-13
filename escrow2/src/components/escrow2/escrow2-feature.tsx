'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { AppHero, ellipsify } from '../ui/ui-layout'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useEscrow2Program } from './escrow2-data-access'
import { Escrow2Create, Escrow2List } from './escrow2-ui'

export default function Escrow2Feature() {
  const { publicKey } = useWallet()
  const { programId } = useEscrow2Program()

  return publicKey ? (
    <div>
      <AppHero
        title="Escrow2"
        subtitle={
          'Create a new account by clicking the "Create" button. The state of a account is stored on-chain and can be manipulated by calling the program\'s methods (increment, decrement, set, and close).'
        }
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
        <Escrow2Create />
      </AppHero>
      <Escrow2List />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <WalletButton />
        </div>
      </div>
    </div>
  )
}
