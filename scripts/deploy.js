const hre = require("hardhat");

async function main() {
  // 실제 주소 입력
  const owners = [
    "0xD57C10C4b14f15A2197C40207c23830065c90167",
    "0x3819a3E6F2d9F8b67c61B7Dd190E9aF7e45239d1",
    "0xcf9448DEF448d511f60920816489499DBfF28856",
  ];
  const threshold = 2;

  const SimpleMultisig = await hre.ethers.getContractFactory("SimpleMultisig");
  const multisig = await SimpleMultisig.deploy(owners, threshold);

  await multisig.waitForDeployment();

  console.log(`SimpleMultisig deployed to: ${await multisig.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
