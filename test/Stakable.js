const { expect } = require("chai");
const helper = require("./helpers/truffleTestHelpers");
const { BN, expectRevert, expectEvent } = require("@openzeppelin/test-helpers");

const DevToken = artifacts.require("DevToken");

contract("Stakable", async (accounts) => {
  let devToken;

  beforeEach("setup", async () => {
    devToken = await DevToken.new(
      "DevToken",
      "DVTK",
      18,
      "50000000000000000000000"
    );
  });

  it("should stake 100x2", async () => {
    const owner = accounts[0];
    const stake_amount = 100;

    // Add some tokens on account 1 as well
    await devToken.mint(accounts[1], 1000);

    // Get init balance of the owner
    const ownerBalance = await devToken.balanceOf(owner);

    // Stake and get the index
    const stakeID = await devToken.stake(stake_amount, { from: owner });

    // Staked some tokens successfully
    expectEvent(await devToken.stake(stake_amount), "Staked", {
      user: owner,
      amount: new BN(stake_amount),
      index: new BN(1),
    });
  });
  it("should not stake more than owning", async () => {
    await expectRevert(
      devToken.stake(1000000000, { from: accounts[2] }),
      "DevToken: Cannot stake more than you own."
    );
  });
  it("should increase stake index", async () => {
    // const devToken = await DevToken.deployed();
    const stake_amount = 100;

    // Add some tokens on account 2 as well
    await devToken.mint(accounts[2], 1000);

    await devToken.stake(stake_amount, { from: accounts[0] });
    await devToken.stake(stake_amount, { from: accounts[0] });

    // Staked some tokens successfully
    expectEvent(
      await devToken.stake(stake_amount, { from: accounts[2] }),
      "Staked",
      {
        index: new BN(2),
      }
    );
  });
  it("cant withdraw bigger amount than current staked", async () => {
    const owner = accounts[0];
    await devToken.mint(owner, 1000);
    await devToken.stake(100, { from: owner });
    await devToken.stake(200, { from: owner });

    //Try withdrawing 200 from first stake
    await expectRevert(
      devToken.withdrawStake(500, 0, { from: owner }),
      "Staking: Cannot withdraw more than you have staked."
    );
  });

  it("withdraw 50 from a stake", async () => {
    const owner = accounts[4];
    const withdraw_amount = 50;
    const owner_stake_amount = 100;

    // Grab a new summary to see if the total amount has changed
    const summary1 = await devToken.hasStake(owner);

    // Should be zero when the user doens't have any staking made
    expect(summary1.total_amount).to.be.a.bignumber.equal(new BN(0));

    // stake 2x
    await devToken.mint(owner, 1000);
    await devToken.stake(owner_stake_amount, { from: owner });
    await devToken.stake(owner_stake_amount, { from: owner });

    // Try withdrawing 50 from first stake
    await devToken.withdrawStake(withdraw_amount, 0, { from: owner });

    // Grab a new summary to see if the total amount has changed
    const summary = await devToken.hasStake(owner);

    expect(summary.total_amount).to.be.a.bignumber.equal(
      new BN(200 - withdraw_amount)
    );

    // Check first stake separetely to see if it has changed after widrawing some value out of it
    const stake_amount = summary.stakes[0].amount;
    expect(stake_amount).to.be.a.bignumber.equal(new BN(100 - withdraw_amount));
  });

  it("remove stake if empty", async () => {
    const owner = accounts[4];
    const withdraw_amount = 50;

    // deposit 50 to stake
    await devToken.mint(owner, withdraw_amount);
    await devToken.stake(withdraw_amount, { from: owner });

    // Try withdrawing 50 from  stake
    await devToken.withdrawStake(withdraw_amount, 0, { from: owner });

    const summary = await devToken.hasStake(owner);

    expect(summary.stakes[0].user).to.be.equal(
      "0x0000000000000000000000000000000000000000"
    );
  });

  it("calculate rewards", async () => {
    const owner = accounts[0];
    const deposit = 100;
    const twenty_hours = 3600 * 20;
    await devToken.mint(owner, 5000);
    await devToken.stake(deposit, { from: owner });

    // Owner has 1 stake at this time, its the index 1 with 100 tokens staked
    // so lets fast forward time by 20 hours and se if we gain 2% reward
    await helper.advanceTimeAndBlock(twenty_hours);
    let summary = await devToken.hasStake(owner);
    let stake = summary.stakes[0];
    expect(stake.claimable).to.be.a.bignumber.equal(new BN(100 * 0.02));

    // Make a new stake of 1000, fast forward 20 hours again, make sure total stake rerwards is 24(20+4)
    // Remember that the first 100 has been staked for 40 hours now, so its 4 in rerwards
    await devToken.stake(1000, { from: owner });
    await helper.advanceTimeAndBlock(twenty_hours);
    summary = await devToken.hasStake(owner);
    stake = summary.stakes[0];
    const new_stake = summary.stakes[1];

    expect(stake.claimable).to.be.a.bignumber.equal(new BN(100 * 0.04));
    expect(new_stake.claimable).to.be.a.bignumber.equal(new BN(1000 * 0.02));
  });

  it("deliver rewards stakes", async () => {
    const staker = accounts[5];
    const twentyHours = 3600 * 20;
    const valueDeposited = 1000;
    const valueStaked = 200;
    const withdrawAmount = 200;
    await devToken.mint(staker, valueDeposited);

    // Make a stake on 200,
    // fast forward 20 hours,
    // claim rewards
    // amount should be Initial balance + 4
    await devToken.stake(valueStaked, { from: staker });
    await helper.advanceTimeAndBlock(twentyHours);

    const stakeSummary = await devToken.hasStake(staker);
    const stake = stakeSummary.stakes[0];

    // Withdraw 200 from stake at index 0
    await devToken.withdrawStake(withdrawAmount, 0, { from: staker });

    // Balance of account holder should be updated to 104 tokens
    const after_balance = await devToken.balanceOf(staker);
    expect(after_balance).to.be.a.bignumber.equal(new BN(1004));
  });
});
