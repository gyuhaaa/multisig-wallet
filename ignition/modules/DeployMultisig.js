import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployMultisig = buildModule("DeployMultisig", (m) => {
  const owners = [m.getAccount(0), m.getAccount(1), m.getAccount(2)];
  const threshold = 2;

  const multisig = m.contract("SimpleMultisig", [owners, threshold]);

  return { multisig };
});

export default DeployMultisig;
