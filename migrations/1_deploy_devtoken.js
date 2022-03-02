const DevToken = artifacts.require("DevToken");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(
    DevToken,
    "DevToken",
    "DVTK",
    18,
    "50000000000000000000000"
  );
};
