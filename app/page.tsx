'use client';

import { useAccount } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
import StakingForm from '../components/StakingForm'; // Import component StakingForm

// --- Main Page Component ---
export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 font-mono">
      {isConnected ? (
        <StakingForm /> // Sử dụng component StakingForm ở đây
      ) : (
        <div className="text-center border border-white p-8 space-y-4">
          <h1 className="text-2xl">[ STAKING DAPP ]</h1>
          <p>CONNECT WALLET TO BEGIN</p>
          <ConnectKitButton />
        </div>
      )}
    </main>
  );
}
