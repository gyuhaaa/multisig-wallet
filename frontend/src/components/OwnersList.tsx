import { useContract } from "../hooks/useContract";

export default function OwnersList() {
  const { owners, threshold, account } = useContract();

  const shortAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">소유자 목록</h2>
      <div className="mb-2">
        <p className="text-gray-600 dark:text-gray-300">
          트랜잭션 실행에 필요한 승인 수:{" "}
          <span className="font-medium">{threshold}</span>
        </p>
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-medium mb-2">소유자</h3>
        <ul className="space-y-2">
          {owners.map((owner, index) => (
            <li
              key={index}
              className={`p-2 rounded ${
                owner.toLowerCase() === account.toLowerCase()
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                  : "bg-gray-50 dark:bg-gray-700/30"
              }`}
            >
              <div className="flex items-center">
                {owner.toLowerCase() === account.toLowerCase() && (
                  <span className="inline-flex items-center justify-center bg-blue-500 text-white text-xs rounded px-2 py-1 mr-2">
                    본인
                  </span>
                )}
                <span className="font-mono">{owner}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
