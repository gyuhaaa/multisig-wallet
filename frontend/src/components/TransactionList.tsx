import { useState, useEffect } from "react";
import { useContract } from "../hooks/useContract";
import Button from "./Button";

export default function TransactionList() {
  const {
    transactions,
    owners,
    account,
    threshold,
    confirmTransaction,
    revokeConfirmation,
    executeTransaction,
    isConfirmed,
    isLoading,
  } = useContract();

  const [confirmations, setConfirmations] = useState<Record<number, boolean>>(
    {}
  );

  const shortAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 본인의 승인 상태 확인
  useEffect(() => {
    const checkConfirmations = async () => {
      if (!account || transactions.length === 0) return;

      const confirmationStatus: Record<number, boolean> = {};

      for (let i = 0; i < transactions.length; i++) {
        confirmationStatus[i] = await isConfirmed(i, account);
      }

      setConfirmations(confirmationStatus);
    };

    checkConfirmations();
  }, [account, transactions, isConfirmed]);

  // 트랜잭션 승인 처리
  const handleConfirm = async (txIndex: number) => {
    await confirmTransaction(txIndex);
  };

  // 트랜잭션 승인 취소
  const handleRevoke = async (txIndex: number) => {
    await revokeConfirmation(txIndex);
  };

  // 트랜잭션 실행
  const handleExecute = async (txIndex: number) => {
    await executeTransaction(txIndex);
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">트랜잭션 목록</h2>
        <p className="text-gray-600 dark:text-gray-300">트랜잭션이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">트랜잭션 목록</h2>

      <div className="space-y-6">
        {transactions.map((tx, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${
              tx.executed
                ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            <div className="flex justify-between mb-2">
              <span className="font-medium">트랜잭션 #{index}</span>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  tx.executed
                    ? "bg-green-500 text-white"
                    : "bg-yellow-500 text-white"
                }`}
              >
                {tx.executed ? "실행됨" : "대기중"}
              </span>
            </div>

            <div className="space-y-1 mb-3 text-sm">
              <p>
                <span className="font-medium">수신자:</span>{" "}
                <span className="font-mono">{tx.to}</span>
              </p>
              <p>
                <span className="font-medium">금액:</span> {tx.value} ETH
              </p>
              <p>
                <span className="font-medium">데이터:</span>{" "}
                <span className="font-mono text-xs truncate block">
                  {tx.data}
                </span>
              </p>
              <p>
                <span className="font-medium">승인 현황:</span>{" "}
                {tx.numConfirmations}/{threshold}(
                {tx.numConfirmations >= threshold
                  ? "실행 가능"
                  : "추가 승인 필요"}
                )
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              {!tx.executed && (
                <>
                  {!confirmations[index] ? (
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(index)}
                      disabled={isLoading}
                    >
                      승인하기
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRevoke(index)}
                      disabled={isLoading}
                    >
                      승인 취소
                    </Button>
                  )}

                  {tx.numConfirmations >= threshold && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleExecute(index)}
                      disabled={isLoading}
                    >
                      실행하기
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
