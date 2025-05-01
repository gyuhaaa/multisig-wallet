import { useEffect } from "react";
import Layout from "./components/Layout";
import WalletConnector from "./components/WalletConnector";
import OwnersList from "./components/OwnersList";
import TransactionList from "./components/TransactionList";
import TransactionForm from "./components/TransactionForm";
import { useContract } from "./hooks/useContract";

function App() {
  const { account, loadContractData, error } = useContract();

  // 지갑 연결 후 데이터 로드
  useEffect(() => {
    if (account) {
      loadContractData();
    }
  }, [account, loadContractData]);

  return (
    <Layout>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      <WalletConnector />

      {account && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <OwnersList />
          </div>
          <div className="lg:col-span-2">
            <TransactionForm />
            <TransactionList />
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
