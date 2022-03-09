const { expect } = require("chai");
const { BN, expectRevert, expectEvent } = require("@openzeppelin/test-helpers");

const DevToken = artifacts.require("DevToken");

contract("DevToken", async (accounts) => {
  const NAME = "DevToken";
  const SYMBOL = "DVTK";
  const DECIMALS = new BN("18");
  const TOTAL_SUPPLY = new BN("50000000000000000000000");

  it("should have initial information properly set", async () => {
    const devToken = await DevToken.deployed();

    expect(await devToken.name()).to.be.equal(NAME);
    expect(await devToken.symbol()).to.be.equal(SYMBOL);
    expect(await devToken.decimals()).to.be.bignumber.equal(DECIMALS);
    expect(await devToken.totalSupply()).to.be.bignumber.equal(TOTAL_SUPPLY);
  });

  it("should mint", async () => {
    const devToken = await DevToken.deployed();

    // Let's use account 1 since that account should have 0
    const initial_balance = await devToken.balanceOf(accounts[1]);
    expect(initial_balance).to.be.bignumber.equal(new BN("0"));

    // Let's mint 100 tokens to the user and grab the balance again
    const mintedTokens = 100;
    const totalSupply = await devToken.totalSupply();

    // Minted some tokens successfully
    expectEvent(await devToken.mint(accounts[1], 100), "Transfer", {
      from: "0x0000000000000000000000000000000000000000",
      to: accounts[1],
      value: new BN(100),
    });

    // Grab the balance again to see what it is after calling mint
    const after_balance = await devToken.balanceOf(accounts[1]);
    const after_supply = await devToken.getTotalSupply();
    const supply_plus_addition = new BN(totalSupply).add(new BN(mintedTokens));

    expect(after_balance).to.be.bignumber.equal(new BN(mintedTokens));
    expect(after_supply).to.be.bignumber.equal(supply_plus_addition);

    // Mint with address 0, it should fail
    await expectRevert(
      devToken.mint("0x0000000000000000000000000000000000000000", 100),
      "DevToken: cannot mint to zero address"
    );
  });

  it("should burn", async () => {
    const devToken = await DevToken.deployed();

    // Let's use account 1 since that account should have 0
    const initial_balance = await devToken.balanceOf(accounts[1]);
    const totalSupply = await devToken.getTotalSupply();

    // Burn to address 0, it should fail
    await expectRevert(
      devToken.burn("0x0000000000000000000000000000000000000000", 100),
      "DevToken: cannot burn from zero address"
    );

    // Burn more than balance
    await expectRevert(
      devToken.burn(accounts[1], initial_balance + initial_balance),
      "DevToken: Cannot burn more than the account owns"
    );

    // Burn some tokens successfully
    expectEvent(
      await devToken.burn(accounts[1], initial_balance - 50),
      "Transfer",
      {
        from: accounts[1],
        to: "0x0000000000000000000000000000000000000000",
        value: new BN(initial_balance - 50),
      }
    );

    // Make sure balance and totalSupply are reduced when tokens burn
    const balance = await devToken.balanceOf(accounts[1]);
    const newSupply = await devToken.getTotalSupply();

    expect(new BN(balance)).to.be.a.bignumber.equal(
      new BN(initial_balance - 50)
    );
    expect(newSupply).to.be.a.bignumber.equal(
      new BN(totalSupply).sub(new BN(50))
    );
  });
  it("should transfer tokens", async () => {
    const devToken = await DevToken.deployed();

    // Grab initial balance
    const initial_balance = await devToken.balanceOf(accounts[1]);

    // transfer tokens from account 0 to 1
    await devToken.transfer(accounts[1], 100);

    const after_balance = await devToken.balanceOf(accounts[1]);

    expect(after_balance).to.be.a.bignumber.equal(
      new BN(initial_balance).add(new BN(100))
    );

    const account2_initial_balance = await devToken.balanceOf(accounts[2]);

    // We can change the msg.sender using the FROM value in function calls
    await devToken.transfer(accounts[2], 20, { from: accounts[1] });

    // Make sure balances are switched on both accounts
    const account2_after_balance = await devToken.balanceOf(accounts[2]);
    const account1_after_balance = await devToken.balanceOf(accounts[1]);

    expect(account1_after_balance).to.be.a.bignumber.equal(
      new BN(after_balance).sub(new BN(20))
    );
    expect(account2_after_balance).to.be.a.bignumber.equal(
      new BN(account2_initial_balance).add(new BN(20))
    );

    // Try transfering too much
    await expectRevert(
      devToken.transfer(accounts[2], 2000000000000, { from: accounts[1] }),
      "DevToken: cant transfer more than your account holds"
    );
  });

  it("should allow account some allowance", async () => {
    const devToken = await DevToken.deployed();

    // Give account(0) access to 100 tokens of the creator
    await expectRevert(
      devToken.approve("0x0000000000000000000000000000000000000000", 100),
      "DevToken: approve cannot be to zero address"
    );

    // Give account 1 access to 100 tokens on zero account
    await devToken.approve(accounts[1], 100);

    // Verify by checking allowance
    const allowance = await devToken.allowance(accounts[0], accounts[1]);
    expect(allowance).to.be.a.bignumber.equal(new BN(100));
  });
  it("should transfer with allowance", async () => {
    const devToken = await DevToken.deployed();

    // Account 1 should have 100 tokens by now to use on account 0
    // let's try using more
    await expectRevert(
      devToken.transferFrom(accounts[0], accounts[2], 200, {
        from: accounts[1],
      }),
      "DevToken: You cannot spend that much on this account"
    );

    const initial_allowance = await devToken.allowance(
      accounts[0],
      accounts[1]
    );

    // transfer 50 tokens from account 0 to 2
    await devToken.transferFrom(accounts[0], accounts[2], 50, {
      from: accounts[1],
    });

    const new_allowance = await devToken.allowance(accounts[0], accounts[1]);
    expect(new_allowance).to.be.a.bignumber.equal(
      new BN(initial_allowance - 50)
    );
  });
});
