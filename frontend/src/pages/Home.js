import React from "react";
import { useContract } from "../context/ContractProvider";

const Home = () => {
  const { electionAdmin } = useContract();

  return (
    <div>
      <h1>Blockchain Voting System</h1>
      <p>Welcome to the blockchain voting system</p>
      <p>This election is ran by the election admin with a blockchain address of {electionAdmin}</p>
      <p>This election is Cryptographically secured via the use of Blockchain and Smart Contract Technology</p>
    </div>
  );
};

export default Home;