import logo from "./logo.svg";
import "./App.css";
import React, { useState, useEffect } from "react";
import Web3 from "web3-eth";
import { CONTRACT_ADDRESS } from "./config";

function App() {
  const [devToken, setDevToken] = useState(0);
  const [accounts, setAccounts] = useState(0);
  const [totalSupply, setTotalSupply] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [accountBalance, setAcccountBalance] = useState(0);
  const [accountStakes, setAccountStakes] = useState({});

  useEffect(
    () => {
      // Only get profile if we are completely loaded
      if (loaded && accounts !== 0) {
        // get user info
        getUserProfile();

        // Subscribe to stake events
        // options allow us to specificy filter so we dont grab all events
        // in this case we only select our current account on metamask
        const options = {
          filter: {
            address: [accounts[0]],
          },
        };

        // Our contract has a field called events which has all Available events
        devToken.events
          .Staked(options)
          .on("data", (event) => console.log("Data: ", event))
          .on("changed", (changed) => console.log("Changed: ", changed))
          .on("error", (error) => console.log("Error: ", error))
          .on("connected", (connected) =>
            console.log("Connected: ", connected)
          );
      } else {
        // dirty trick to trigger reload if something went wrong
        setTimeout(setLoaded(true), 500);
      }
    },
    // These subscribes to changes on the loaded and accounts state
    [loaded, accounts]
  );

  useEffect(() => {
    if (typeof Web3 !== "undefined") {
      window.web3 = new Web3(window.ethereum);
      // Check if MM is installed
      if (window.ethereum.isMetaMask === true) {
        connectToMetaMask();
        connectToSelectedNetwork();
      } else {
        // Another web3 provider, add support if you want
      }
    } else {
      // The browser has no web3
      throw new Error("No web3 support, please install MetaMask or similar");
    }
  }, []);

  function connectToMetaMask() {
    // We need to make the connection to MM works.
    // Send request for accounts and to connect to MM.
    window.web3
      .requestAccounts()
      .then((result) => {
        // Whenever the user accepts this will trigger
        setAccounts(result);
      })
      .catch((error) => {
        throw new Error(error);
      });
  }

  async function getUserProfile() {
    // Total supply
    call(devToken.methods.getTotalSupply, setTotalSupply);

    // balanceOf
    call(devToken.methods.balanceOf, setAcccountBalance, accounts[0]);

    // has stake
    call(devToken.methods.hasStake, setAccountStakes, accounts[0]);
  }

  function call(func, callback, ...args) {
    // Trigger the function with the arguments
    func(...args)
      .call()
      .then((result) => {
        // Apply given callback, this is our stateSetters
        callback(result);
      })
      .catch((error) => {
        throw new Error(error);
      });
  }

  async function connectToSelectedNetwork() {
    // This will connect to the selected network inside MetaMask
    const web3 = new Web3(Web3.givenProvider);
    const abi = require("./DevToken.json").abi;

    // Make a new instance of the contract by gibing the address and abi
    const devTokenContract = new web3.Contract(abi, CONTRACT_ADDRESS);

    setDevToken(devTokenContract);
  }

  // Stake will trigger a stake on the users behalf
  function stake() {
    // When we trigger Transactions we should use send instead of call
    // We should also calculate the GAS cost so we can apply the correct amount of gas
    devToken.methods
      .stake(1000)
      .estimateGas({ from: accounts[0] })
      .then((gas) => {
        // We now have the gas amount, we can now send the transaction
        devToken.methods.stake(1000).send({
          from: accounts[0],
          gas: gas,
        });

        // Fake update of the account by changing stake, Trigger a reload when transaction is done later
        setAcccountBalance(accountBalance - 1000);
      });
  }

  return (
    <div className="App">
      <header className="App-header">
        <p>Welcome to Optimum Protocol</p>
        <p>Token total supply is {totalSupply}</p>
        <p>Account balance: {accountBalance}</p>

        <button onClick={stake}>
          <p>Stake</p>
        </button>
      </header>
    </div>
  );
}

export default App;
