'use client';

// BƯỚC 1: Import các thư viện cần thiết
import { WagmiProvider, createConfig, http } from 'wagmi';
// `chains` cung cấp thông tin cấu hình cho các mạng blockchain khác nhau (ví dụ: Mainnet, Sepolia, Localhost).
import { mainnet, sepolia, localhost } from 'wagmi/chains';
// `react-query` được Wagmi sử dụng để quản lý state, caching và fetching dữ liệu từ blockchain.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// `ConnectKit` là một thư viện UI giúp người dùng dễ dàng kết nối ví của họ.
import { ConnectKitProvider, getDefaultConfig } from 'connectkit';

// BƯỚC 2: Cấu hình Wagmi và ConnectKit
const config = createConfig(
  getDefaultConfig({
    // `chains`: Đây là danh sách các mạng mà dApp của bạn hỗ trợ.
    // Trước đây, nó chỉ có `mainnet` và `sepolia`.
    // Giờ đây chúng ta đã thêm `localhost` để có thể kết nối với mạng local.
    chains: [mainnet, sepolia, localhost],
    // `transports`: Định nghĩa cách Wagmi sẽ giao tiếp với từng mạng (qua HTTP RPC).
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [localhost.id]: http(), // Thêm transport cho localhost.
    },

    // Các thông tin khác để hiển thị trên giao diện kết nối ví.
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    appName: 'Staking DApp',
    appDescription: 'A simple staking dApp',
    appUrl: 'https://family.co',
    appIcon: 'https://family.co/logo.png',
  })
);

// BƯỚC 3: Khởi tạo QueryClient
// QueryClient quản lý việc caching dữ liệu để dApp chạy nhanh hơn.
const queryClient = new QueryClient();

// BƯỚC 4: Tạo Provider component
// Component này sẽ "bọc" toàn bộ ứng dụng của bạn, cung cấp context của Wagmi và React Query.
export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="retro">{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
