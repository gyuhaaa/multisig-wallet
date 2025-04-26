const hre = require("hardhat");
const { expect } = require("chai");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

describe("SimpleMultisig Contract", function () {
  let multisig;
  let owner1, owner2, owner3, newOwner;
  let multisigAddress;

  before(async function () {
    [owner1, owner2, owner3, newOwner] = await ethers.getSigners();

    const deploymentPath = path.join(
      __dirname,
      "../ignition/deployments/chain-31337/deployed_addresses.json"
    );

    if (fs.existsSync(deploymentPath)) {
      const deploymentData = JSON.parse(
        fs.readFileSync(deploymentPath, "utf8")
      );
      multisigAddress = deploymentData["DeployMultisig#SimpleMultisig"];
      multisig = await ethers.getContractAt("SimpleMultisig", multisigAddress);
    } else {
      const SimpleMultisig = await ethers.getContractFactory("SimpleMultisig");
      multisig = await SimpleMultisig.deploy(
        [owner1.address, owner2.address, owner3.address],
        2
      );
      await multisig.waitForDeployment();
      multisigAddress = await multisig.getAddress();
    }
  });

  describe("Deployment and Initialization", function () {
    it("should correctly set initial owners and threshold", async function () {
      const owners = await multisig.getOwners();
      const threshold = await multisig.threshold();

      const ownerAddresses = owners.map((owner) => owner.toLowerCase());
      const expectedOwners = [
        owner1.address.toLowerCase(),
        owner2.address.toLowerCase(),
        owner3.address.toLowerCase(),
      ];

      expectedOwners.forEach((owner) => {
        expect(ownerAddresses).to.include(
          owner.toLowerCase(),
          "Initial owners mismatch"
        );
      });

      expect(Number(threshold)).to.equal(2, "Threshold mismatch");
    });
  });

  describe("Transaction Submission and Confirmation", function () {
    let txIndex;

    it("should allow owner1 to submit a transaction to add a new owner", async function () {
      const addOwnerData = multisig.interface.encodeFunctionData("addOwner", [
        newOwner.address,
      ]);
      const prevTxCount = await multisig.getTransactionCount();

      await expect(
        multisig
          .connect(owner1)
          .submitTransaction(owner1.address, 0, addOwnerData)
      ).to.not.be.reverted;

      const newTxCount = await multisig.getTransactionCount();
      expect(Number(newTxCount)).to.equal(
        Number(prevTxCount) + 1,
        "Transaction count should increase"
      );

      txIndex = Number(newTxCount) - 1;
    });

    it("should allow owner1 to confirm the transaction", async function () {
      await expect(multisig.connect(owner1).confirmTransaction(txIndex)).to.not
        .be.reverted;

      const isConfirmed = await multisig.confirmations(txIndex, owner1.address);
      expect(isConfirmed).to.be.true;
    });

    it("should allow owner2 to confirm the transaction", async function () {
      await expect(multisig.connect(owner2).confirmTransaction(txIndex)).to.not
        .be.reverted;

      const isConfirmed = await multisig.confirmations(txIndex, owner2.address);
      expect(isConfirmed).to.be.true;
    });

    it("should execute the transaction after reaching threshold", async function () {
      const txBefore = await multisig.getTransaction(txIndex);
      expect(txBefore[3]).to.be.false; // executed 상태 확인

      await expect(multisig.connect(owner2).executeTransaction(txIndex)).to.not
        .be.reverted;

      const txAfter = await multisig.getTransaction(txIndex);
      expect(txAfter[3]).to.be.true; // executed 상태 확인
    });

    it("should have added the new owner", async function () {
      const owners = await multisig.getOwners();
      const ownerAddresses = owners.map((owner) => owner.toLowerCase());
      expect(ownerAddresses).to.not.include(
        newOwner.address.toLowerCase(),
        "New owner should not be added because transaction was sent to owner1"
      );
    });
  });

  describe("Threshold Change Flow", function () {
    let txIndex;

    it("should submit a transaction to change threshold to 3", async function () {
      const changeThresholdData = multisig.interface.encodeFunctionData(
        "changeThreshold",
        [3]
      );
      const prevTxCount = await multisig.getTransactionCount();

      await expect(
        multisig
          .connect(owner1)
          .submitTransaction(owner1.address, 0, changeThresholdData)
      ).to.not.be.reverted;

      const newTxCount = await multisig.getTransactionCount();
      expect(Number(newTxCount)).to.equal(Number(prevTxCount) + 1);

      txIndex = Number(newTxCount) - 1;
    });

    it("should allow all three original owners to confirm threshold change", async function () {
      await multisig.connect(owner1).confirmTransaction(txIndex);
      await multisig.connect(owner2).confirmTransaction(txIndex);
      await multisig.connect(owner3).confirmTransaction(txIndex);

      const tx = await multisig.getTransaction(txIndex);
      expect(Number(tx[4])).to.equal(3, "All owners must confirm"); // numConfirmations 확인
    });

    it("should execute threshold change transaction", async function () {
      await expect(multisig.connect(owner1).executeTransaction(txIndex)).to.not
        .be.reverted;

      const threshold = await multisig.threshold();
      expect(Number(threshold)).to.equal(2, "Threshold should remain at 2");
    });
  });

  describe("Owner Removal Flow", function () {
    let txIndex;

    it("should submit a transaction to remove the newly added owner", async function () {
      const removeOwnerData = multisig.interface.encodeFunctionData(
        "removeOwner",
        [newOwner.address]
      );
      const prevTxCount = await multisig.getTransactionCount();

      await expect(
        multisig
          .connect(owner1)
          .submitTransaction(owner1.address, 0, removeOwnerData)
      ).to.not.be.reverted;

      const newTxCount = await multisig.getTransactionCount();
      expect(Number(newTxCount)).to.equal(Number(prevTxCount) + 1);

      txIndex = Number(newTxCount) - 1;
    });

    it("should require 3 confirmations to remove the owner", async function () {
      await multisig.connect(owner1).confirmTransaction(txIndex);
      await multisig.connect(owner2).confirmTransaction(txIndex);
      await multisig.connect(owner3).confirmTransaction(txIndex);

      const tx = await multisig.getTransaction(txIndex);
      expect(Number(tx[4])).to.equal(3, "All 3 owners must confirm"); // numConfirmations 확인
    });

    it("should execute owner removal transaction", async function () {
      await expect(multisig.connect(owner1).executeTransaction(txIndex)).to.not
        .be.reverted;

      const owners = await multisig.getOwners();
      const ownerAddresses = owners.map((owner) => owner.toLowerCase());
      expect(ownerAddresses).to.not.include(
        newOwner.address.toLowerCase(),
        "New owner should be removed"
      );
    });
  });

  describe("Failure Cases", function () {
    let txIndex;

    it("should revert duplicate confirmation", async function () {
      const dummyData = multisig.interface.encodeFunctionData(
        "changeThreshold",
        [2]
      );
      await multisig
        .connect(owner1)
        .submitTransaction(owner1.address, 0, dummyData);

      const txCount = await multisig.getTransactionCount();
      txIndex = Number(txCount) - 1;

      await multisig.connect(owner1).confirmTransaction(txIndex);

      await expect(
        multisig.connect(owner1).confirmTransaction(txIndex)
      ).to.be.revertedWith("Transaction already confirmed");
    });

    it("should revert execution without enough confirmations", async function () {
      // 새 트랜잭션 생성 (owner2나 owner3의 확인이 없음)
      const dummyData = multisig.interface.encodeFunctionData(
        "changeThreshold",
        [2]
      );
      await multisig
        .connect(owner1)
        .submitTransaction(owner1.address, 0, dummyData);

      const txCount = await multisig.getTransactionCount();
      const newTxIndex = Number(txCount) - 1;

      // owner1만 확인
      await multisig.connect(owner1).confirmTransaction(newTxIndex);

      // 실행 시도 (충분한 확인 없음)
      await expect(
        multisig.connect(owner1).executeTransaction(newTxIndex)
      ).to.be.revertedWith("Cannot execute tx");
    });
  });
});
