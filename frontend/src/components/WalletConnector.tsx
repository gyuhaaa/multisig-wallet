import { useEffect, useState } from "react";
import Button from "./Button";
import { useContract } from "../hooks/useContract";

export default function WalletConnector() {
  const { connectWallet, account, isLoading } = useContract();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const shortAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">지갑 연결</h2>

      {!account ? (
        <div>
          <p className="mb-4 text-gray-600 dark:text-gray-300">
            멀티시그 지갑을 사용하려면 먼저 이더리움 지갑을 연결해주세요.
          </p>
          <Button onClick={connectWallet} disabled={isLoading}>
            {isLoading ? "연결 중..." : "지갑 연결하기"}
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 dark:text-gray-300">
            연결된 지갑:{" "}
            <span className="font-medium">{shortAddress(account)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
