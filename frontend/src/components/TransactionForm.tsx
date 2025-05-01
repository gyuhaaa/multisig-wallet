import { useState } from "react";
import { useContract } from "../hooks/useContract";
import Button from "./Button";

export default function TransactionForm() {
  const { submitTransaction, isLoading, account } = useContract();

  const [to, setTo] = useState("");
  const [value, setValue] = useState("");
  const [data, setData] = useState("0x");
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!to || !value) {
      alert("수신자 주소와 금액을 입력해주세요.");
      return;
    }

    const success = await submitTransaction(to, value, data);

    if (success) {
      setTo("");
      setValue("");
      setData("0x");
      setShowForm(false);
    }
  };

  if (!account) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">새 트랜잭션</h2>
        <Button
          size="sm"
          variant={showForm ? "secondary" : "primary"}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "닫기" : "트랜잭션 생성"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="to" className="block text-sm font-medium mb-1">
              수신자 주소
            </label>
            <input
              type="text"
              id="to"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              placeholder="0x..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="value" className="block text-sm font-medium mb-1">
              금액 (ETH)
            </label>
            <input
              type="text"
              id="value"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              placeholder="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="data" className="block text-sm font-medium mb-1">
              데이터 (선택사항)
            </label>
            <input
              type="text"
              id="data"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                        bg-white dark:bg-gray-700 text-gray-800 dark:text-white font-mono text-sm"
              placeholder="0x..."
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "처리 중..." : "트랜잭션 제출"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
