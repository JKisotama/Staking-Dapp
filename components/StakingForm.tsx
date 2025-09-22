'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { ConnectKitButton } from 'connectkit';
// BƯỚC 1: Import các công cụ cần thiết từ Viem và Wagmi
// parseEther dùng để chuyển đổi số ether (ví dụ: "1.0") sang đơn vị nhỏ nhất là wei.
import { parseEther, formatEther } from 'viem'; 
// useWriteContract là một hook của Wagmi để gửi giao dịch đến smart contract (như stake, unstake).
// useReadContract là một hook của Wagmi để đọc dữ liệu từ smart contract (như đọc số dư).
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'; 
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Import ABI (Application Binary Interface) của Staking contract.
// ABI giống như một bản hướng dẫn cho Viem biết các hàm có trong contract và cách tương tác với chúng.
import StakingABI from '../abi/StakingABI.json';
// Import ABI của Reward Token contract.
import RewardTokenABI from '../abi/RewardTokenABI.json';

// --- TUI-style Staking Form Component ---
export default function StakingForm() {
  const { address, chainId } = useAccount();
  const { data: balance } = useBalance({ address });

  // BƯỚC 2: Lấy địa chỉ contract từ biến môi trường (.env)
  // NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS là biến đã được định nghĩa trong file .env của bạn.
  const stakingContractAddress = process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS as `0x${string}`;
  // Lấy địa chỉ của Reward Token contract.
  const rewardTokenAddress = process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS as `0x${string}`;

  // BƯỚC 3: Khởi tạo hook useWriteContract để gửi giao dịch
  // Hook này sẽ trả về các trạng thái và hàm cần thiết để tương tác với contract.
  const { 
    data: hash, // Chứa mã hash của giao dịch sau khi được gửi thành công.
    isPending, // Trạng thái chờ, true khi giao dịch đang được xử lý.
    writeContract // Hàm để gọi và thực thi một chức năng của smart contract.
  } = useWriteContract();

  // BƯỚC 3.1: Khởi tạo hook useReadContract để đọc số dư Reward Token
  // Hook này sẽ tự động gọi lại khi có sự thay đổi trên blockchain.
  const { data: rewardTokenBalance, refetch: refetchRewardTokenBalance } = useReadContract({
    address: rewardTokenAddress,
    abi: RewardTokenABI.abi,
    functionName: 'balanceOf',
    args: [address], // Tham số là địa chỉ của người dùng hiện tại.
    query: {
      // `enabled: !!address` đảm bảo chỉ gọi hook khi `address` đã có giá trị.
      enabled: !!address,
    }
  });

  // BƯỚC 3.2: Khởi tạo hook useReadContract để đọc số dư đã stake
  const { data: stakedBalance, refetch: refetchStakedBalance } = useReadContract({
    address: stakingContractAddress,
    abi: StakingABI.abi,
    functionName: 's_balances',
    args: [address],
    query: {
      enabled: !!address,
    }
  });

  // BƯỚC 3.3: Khởi tạo hook useReadContract để đọc số reward đã kiếm được
  const { data: earnedBalance, refetch: refetchEarnedBalance } = useReadContract({
    address: stakingContractAddress,
    abi: StakingABI.abi,
    functionName: 'earned',
    args: [address],
    query: {
      enabled: !!address,
    }
  });

  const [amount, setAmount] = useState('0');
  const [action, setAction] = useState<'stake' | 'unstake'>('stake');
  const [pendingAction, setPendingAction] = useState(''); // State để theo dõi hành động đang chờ

  const balanceValue = balance ? parseFloat(balance.formatted).toFixed(4) : '0';
  const stakedBalanceFormatted = stakedBalance ? formatEther(stakedBalance as bigint) : '0';

  // Reset trạng thái pending khi giao dịch kết thúc
  useEffect(() => {
    if (!isPending) {
      setPendingAction('');
    }
  }, [isPending]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const maxBalanceStr = action === 'stake' ? (balance?.formatted || '0') : stakedBalanceFormatted;
    const maxBalanceNum = parseFloat(maxBalanceStr);

    if (amount === maxBalanceStr && value.length > amount.length) {
      return;
    }

    const regex = /^\d*\.?\d*$/;

    if (value === '' || regex.test(value)) {
      if (parseFloat(value) > maxBalanceNum) {
        setAmount(maxBalanceStr);
      } else {
        setAmount(value);
      }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  const handleSetMax = () => {
    const maxAmount = action === 'stake' ? (balance?.formatted || '0') : stakedBalanceFormatted;
    setAmount(maxAmount);
  };

  const handleStake = () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (Number(amount) > Number(balance?.formatted || 0)) {
      toast.error('Số dư không đủ');
      return;
    }
    
    setPendingAction('stake');
    // BƯỚC 4: Tương tác với Smart Contract khi người dùng nhấn nút Stake
    // Chúng ta sẽ gọi hàm `writeContract` đã được khởi tạo ở BƯỚC 3.
    writeContract({
      // Địa chỉ của Staking smart contract.
      address: stakingContractAddress,
      // ABI của Staking smart contract.
      abi: StakingABI.abi,
      // Tên của hàm trong smart contract mà bạn muốn gọi. Ở đây là hàm `stake`.
      functionName: 'stake',
      // Vì hàm `stake` là `payable`, chúng ta cần gửi giá trị ether cùng với giao dịch.
      // `value` chính là số ether (dưới dạng wei) mà chúng ta muốn stake.
      // Thêm `args` để truyền `amount` vào hàm `stake(uint256 amount)`.
      args: [parseEther(amount)],
      value: parseEther(amount),
    });
  };

  // BƯỚC 5: Sử dụng hook useWaitForTransactionReceipt để theo dõi trạng thái giao dịch
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ 
      hash, 
    })

  // Sử dụng useEffect để hiển thị thông báo và cập nhật dữ liệu khi giao dịch thay đổi
  useEffect(() => {
    if (isConfirming) {
      toast.info("Đang xử lý giao dịch...");
    }

    if (isConfirmed) {
      toast.success("Giao dịch thành công!");
      refetchRewardTokenBalance();
      refetchStakedBalance();
      refetchEarnedBalance();
    }
  }, [isConfirming, isConfirmed, refetchRewardTokenBalance, refetchStakedBalance, refetchEarnedBalance]);

  const handleUnstake = () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (Number(amount) > Number(stakedBalanceFormatted)) {
      toast.error('Số dư đã stake không đủ');
      return;
    }

    setPendingAction('unstake');
    // BƯỚC 4.1: Tương tác với Smart Contract khi người dùng nhấn nút Unstake
    writeContract({
      address: stakingContractAddress,
      abi: StakingABI.abi,
      functionName: 'unstake',
      args: [parseEther(amount)],
    });
  };

  const handleClaimReward = () => {
    setPendingAction('claim');
    // BƯỚC 4.2: Tương tác với Smart Contract khi người dùng nhấn nút Claim Reward
    writeContract({
      address: stakingContractAddress,
      abi: StakingABI.abi,
      functionName: 'claimReward',
    });
  };

  const handleSubmit = () => {
    if (action === 'stake') {
      handleStake();
    } else {
      handleUnstake();
    }
  };

  const boxStyle = "border border-white p-4";
  const buttonStyle = "border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";
  const activeButtonStyle = "bg-white text-black";

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        aria-label="notifications"
      />
      <div className={`${boxStyle} w-full max-w-2xl space-y-4`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <p>ADDR: {`${address?.slice(0, 6)}...${address?.slice(-4)}`}</p>
        <p>BAL: {balanceValue} {balance?.symbol}</p>
        <ConnectKitButton />
      </div>

      {/* Staked Balance Display */}
      <div className={`${boxStyle} text-center`}>
        <p>[ YOUR STAKED BALANCE ]</p>
        <p className="text-2xl">{stakedBalance ? formatEther(stakedBalance as bigint) : '0'} ETH</p>
      </div>

      {/* Rewards Display */}
      <div className={`${boxStyle} text-center`}>
        <p>[ YOUR REWARD TOKEN BALANCE ]</p>
        {/* 
          BƯỚC 6: Hiển thị số dư reward token.
          `rewardTokenBalance` trả về là một BigInt (dưới dạng wei).
          Chúng ta dùng `formatEther` để chuyển đổi nó sang định dạng người dùng có thể đọc được.
        */}
        <p className="text-2xl">{rewardTokenBalance ? formatEther(rewardTokenBalance as bigint) : '0'} KRK</p>
      </div>

      {/* Earned Rewards Display */}
      <div className={`${boxStyle} text-center`}>
        <p>[ YOUR EARNED REWARDS ]</p>
        <p className="text-2xl">{earnedBalance ? formatEther(earnedBalance as bigint) : '0'} KRK</p>
        <button 
          onClick={handleClaimReward} 
          disabled={isPending || !earnedBalance || (earnedBalance as bigint) === BigInt(0)}
          className={`${buttonStyle} w-full mt-2 ${activeButtonStyle}`}
        >
          {isPending && pendingAction === 'claim' ? '[ CLAIMING... ]' : '[ CLAIM REWARD ]'}
        </button>
      </div>

      {/* Action Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => { setAction('stake'); setAmount('0'); }}
          className={`${buttonStyle} w-full ${action === 'stake' ? activeButtonStyle : ''}`}
        >
          [ STAKE ]
        </button>
        <button
          onClick={() => { setAction('unstake'); setAmount('0'); }}
          className={`${buttonStyle} w-full ${action === 'unstake' ? activeButtonStyle : ''}`}
        >
          [ UNSTAKE ]
        </button>
      </div>

      {/* Amount Input and Slider */}
      <div className="space-y-2">
        <label htmlFor="amount-input">[ AMOUNT TO {action.toUpperCase()} ]</label>
        <div className="flex items-center gap-2">
          <input
            id="amount-input"
            type="text"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.0"
            className="w-full bg-black border border-white p-2"
            style={{ caretColor: 'white' }}
          />
          <button onClick={handleSetMax} className={`${buttonStyle}`}>MAX</button>
        </div>
        <input
          type="range"
          min="0"
          max={action === 'stake' ? (balance?.formatted || '0') : stakedBalanceFormatted}
          step="0.01"
          value={amount}
          onChange={handleSliderChange}
          className="w-full h-2 bg-black border border-white appearance-none cursor-pointer"
        />
      </div>

      {/* Submit Button */}
      <div className="flex gap-2">
        <button 
          onClick={handleSubmit} 
          disabled={isPending}
          className={`${buttonStyle} w-full ${activeButtonStyle}`}
        >
          {isPending && (pendingAction === 'stake' || pendingAction === 'unstake') 
            ? `[ ${pendingAction === 'stake' ? 'STAKING' : 'UNSTAKING'}... ]` 
            : `[ ${action.toUpperCase()} NOW ]`}
        </button>
      </div>
    </div>
    </>
  );
}
