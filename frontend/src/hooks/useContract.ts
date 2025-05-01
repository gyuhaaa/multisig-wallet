import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { MULTISIG_ABI, CONTRACT_ADDRESS } from "../constants/contractConfig";

type Transaction = {
  to: string;
  value: string;
  data: string;
  executed: boolean;
  numConfirmations: number;
};

export function useContract() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [owners, setOwners] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [account, setAccount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // 이더리움 지갑 연결
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 메타마스크 확인
      if (!window.ethereum) {
        throw new Error("메타마스크를 설치해주세요");
      }

      try {
        // 직접 브라우저 프로바이더 초기화 전에 계정 접근 권한 요청
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        if (!accounts || accounts.length === 0) {
          throw new Error(
            "지갑 계정을 찾을 수 없습니다. 메타마스크에 로그인되어 있는지 확인해주세요."
          );
        }

        const userAccount = accounts[0];
        setAccount(userAccount);

        // 브라우저 프로바이더 초기화
        const ethersProvider = new ethers.BrowserProvider(window.ethereum);
        setProvider(ethersProvider);

        // Signer 객체 생성
        const ethSigner = await ethersProvider.getSigner();
        setSigner(ethSigner);

        // 컨트랙트 인스턴스 생성
        const multisigContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          MULTISIG_ABI,
          ethSigner
        );
        setContract(multisigContract);

        // 계정 변경 이벤트 리스너
        window.ethereum.on("accountsChanged", (newAccounts: string[]) => {
          if (newAccounts.length === 0) {
            // 메타마스크에서 모든 계정 연결 해제된 경우
            setAccount("");
            setSigner(null);
            setContract(null);
          } else {
            setAccount(newAccounts[0]);
          }
        });

        // 네트워크 변경 이벤트 리스너
        window.ethereum.on("chainChanged", () => {
          // 네트워크가 변경되면 페이지 새로고침
          window.location.reload();
        });

        console.log("지갑 연결 성공:", userAccount);
        setIsLoading(false);
        return true;
      } catch (requestError) {
        console.error("계정 요청 오류:", requestError);
        // MetaMask 오류 메시지 더 자세하게 처리
        if (requestError instanceof Error) {
          if (requestError.message.includes("No active wallet found")) {
            throw new Error(
              "메타마스크 지갑이 감지되었지만 활성화되지 않았습니다. 메타마스크 확장 프로그램을 열고 계정에 로그인한 후 다시 시도해주세요."
            );
          } else if (requestError.message.includes("User rejected")) {
            throw new Error(
              "메타마스크 연결 요청이 거부되었습니다. 웹사이트 연결을 허용해주세요."
            );
          } else if (requestError.message.includes("Already processing")) {
            throw new Error(
              "이미 처리 중인 메타마스크 요청이 있습니다. 메타마스크 팝업을 확인해주세요."
            );
          }
        }
        throw new Error(
          "메타마스크 연결 중 오류가 발생했습니다. 메타마스크가 최신 버전인지 확인하고 다시 시도해주세요."
        );
      }
    } catch (err) {
      console.error("지갑 연결 에러:", err);
      setError(
        err instanceof Error ? err.message : "지갑 연결 중 오류가 발생했습니다"
      );
      setIsLoading(false);
      return false;
    }
  }, []);

  // 컨트랙트 데이터 로드
  const loadContractData = useCallback(async () => {
    if (!contract) return;

    try {
      setIsLoading(true);
      setError(null);

      // 소유자 목록 로드
      const ownerList = await contract.getOwners();
      setOwners(ownerList);

      // threshold 로드
      const thresholdValue = await contract.threshold();
      setThreshold(Number(thresholdValue));

      // 트랜잭션 개수 및 상세 정보 로드
      const txCount = await contract.getTransactionCount();
      const txList: Transaction[] = [];

      for (let i = 0; i < txCount; i++) {
        const [to, value, data, executed, numConfirmations] =
          await contract.getTransaction(i);

        txList.push({
          to,
          value: ethers.formatEther(value),
          data,
          executed,
          numConfirmations: Number(numConfirmations),
        });
      }

      setTransactions(txList);
      setIsLoading(false);
    } catch (err) {
      console.error("컨트랙트 데이터 로드 에러:", err);
      setError(
        err instanceof Error
          ? err.message
          : "컨트랙트 데이터 로드 중 오류가 발생했습니다"
      );
      setIsLoading(false);
    }
  }, [contract]);

  // 트랜잭션 제출
  const submitTransaction = useCallback(
    async (to: string, value: string, data: string) => {
      if (!contract || !signer) {
        setError("지갑을 먼저 연결해주세요");
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 이더 단위 변환
        const valueInWei = ethers.parseEther(value);

        // 트랜잭션 제출
        const tx = await contract.submitTransaction(to, valueInWei, data);
        await tx.wait();

        // 데이터 다시 로드
        await loadContractData();

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error("트랜잭션 제출 에러:", err);
        setError(
          err instanceof Error
            ? err.message
            : "트랜잭션 제출 중 오류가 발생했습니다"
        );
        setIsLoading(false);
        return false;
      }
    },
    [contract, signer, loadContractData]
  );

  // 트랜잭션 승인
  const confirmTransaction = useCallback(
    async (txIndex: number) => {
      if (!contract || !signer) {
        setError("지갑을 먼저 연결해주세요");
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);

        const tx = await contract.confirmTransaction(txIndex);
        await tx.wait();

        await loadContractData();

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error("트랜잭션 승인 에러:", err);
        setError(
          err instanceof Error
            ? err.message
            : "트랜잭션 승인 중 오류가 발생했습니다"
        );
        setIsLoading(false);
        return false;
      }
    },
    [contract, signer, loadContractData]
  );

  // 트랜잭션 실행
  const executeTransaction = useCallback(
    async (txIndex: number) => {
      if (!contract || !signer) {
        setError("지갑을 먼저 연결해주세요");
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);

        const tx = await contract.executeTransaction(txIndex);
        await tx.wait();

        await loadContractData();

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error("트랜잭션 실행 에러:", err);
        setError(
          err instanceof Error
            ? err.message
            : "트랜잭션 실행 중 오류가 발생했습니다"
        );
        setIsLoading(false);
        return false;
      }
    },
    [contract, signer, loadContractData]
  );

  // 트랜잭션 승인 취소
  const revokeConfirmation = useCallback(
    async (txIndex: number) => {
      if (!contract || !signer) {
        setError("지갑을 먼저 연결해주세요");
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);

        const tx = await contract.revokeConfirmation(txIndex);
        await tx.wait();

        await loadContractData();

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error("승인 취소 에러:", err);
        setError(
          err instanceof Error
            ? err.message
            : "승인 취소 중 오류가 발생했습니다"
        );
        setIsLoading(false);
        return false;
      }
    },
    [contract, signer, loadContractData]
  );

  // 소유자 추가
  const addOwner = useCallback(
    async (newOwner: string) => {
      if (!contract || !signer) {
        setError("지갑을 먼저 연결해주세요");
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);

        const tx = await contract.addOwner(newOwner);
        await tx.wait();

        await loadContractData();

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error("소유자 추가 에러:", err);
        setError(
          err instanceof Error
            ? err.message
            : "소유자 추가 중 오류가 발생했습니다"
        );
        setIsLoading(false);
        return false;
      }
    },
    [contract, signer, loadContractData]
  );

  // threshold 변경
  const changeThreshold = useCallback(
    async (newThreshold: number) => {
      if (!contract || !signer) {
        setError("지갑을 먼저 연결해주세요");
        return false;
      }

      try {
        setIsLoading(true);
        setError(null);

        const tx = await contract.changeThreshold(newThreshold);
        await tx.wait();

        await loadContractData();

        setIsLoading(false);
        return true;
      } catch (err) {
        console.error("threshold 변경 에러:", err);
        setError(
          err instanceof Error
            ? err.message
            : "threshold 변경 중 오류가 발생했습니다"
        );
        setIsLoading(false);
        return false;
      }
    },
    [contract, signer, loadContractData]
  );

  // 소유자인지 확인
  const checkIsOwner = useCallback(
    async (address: string) => {
      if (!contract) return false;

      try {
        const isOwnerStatus = await contract.isOwner(address);
        return isOwnerStatus;
      } catch (err) {
        console.error("소유자 확인 에러:", err);
        return false;
      }
    },
    [contract]
  );

  // 트랜잭션 확인 상태 체크
  const isConfirmed = useCallback(
    async (txIndex: number, address: string) => {
      if (!contract) return false;

      try {
        const confirmed = await contract.confirmations(txIndex, address);
        return confirmed;
      } catch (err) {
        console.error("확인 상태 체크 에러:", err);
        return false;
      }
    },
    [contract]
  );

  // 계정 변경시 데이터 다시 로드
  useEffect(() => {
    if (contract && account) {
      loadContractData();
    }
  }, [contract, account, loadContractData]);

  return {
    connectWallet,
    loadContractData,
    submitTransaction,
    confirmTransaction,
    executeTransaction,
    revokeConfirmation,
    addOwner,
    changeThreshold,
    checkIsOwner,
    isConfirmed,
    account,
    owners,
    threshold,
    transactions,
    isLoading,
    error,
  };
}
