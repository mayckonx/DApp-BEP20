const { expect } = require("chai");
const { BN, expectRevert, expectEvent } = require("@openzeppelin/test-helpers");

const Ownable = artifacts.require("DevToken");

contract("Ownable", async (accounts) => {
  it("should transfer ownership", async () => {
    const ownable = await Ownable.deployed();
    const owner = await ownable.owner();

    // Make sure account 0 is owner
    expect(owner).to.be.equal(accounts[0]);

    // Transfer it to account 1
    await ownable.transferOwnership(accounts[1]);

    // Verify that account 1 is the new owner
    const new_owner = await ownable.owner();
    expect(new_owner).to.be.equal(accounts[1]);
  });

  it("onlyOwner modifier", async () => {
    const ownable = await Ownable.deployed();

    // renounce from accounts 1 as it is the new owner
    await ownable.renounceOwnership({ from: accounts[1] });

    const owner = await ownable.owner();

    expect(owner, "0x0000000000000000000000000000000000000000");

    // try to use the onlyOwner modifier with not-owner account
    await expectRevert(
      ownable.renounceOwnership({ from: accounts[2] }),
      "Ownable: only onwer can call this function"
    );
  });
});
