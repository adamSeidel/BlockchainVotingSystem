import React, { createContext, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";

import TokenArtifact from "../contracts/Election.json";
import contractAddress from "../contracts/contract-address.json";

const ContractContext = createContext();

export const useContract = () => useContext(ContractContext);

export const ContractProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [electionAdmin, setElectionAdmin] = useState("");
  const [electionCandidates, setElectionCandidates] = useState([]);
  const [eligibleVoters, setEligibleVoters] = useState([]);
  const [votersWhoHaveVoted, setVotersWhoHaveVoted] = useState([]);
  const [votersWhoHaveNotVoted, setVotersWhoHaveNotVoted] = useState([]);

  useEffect(() => {
    const init = async () => {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
            contractAddress.Election,
            TokenArtifact.abi,
            signer
        );
        setToken(contract);

        // Fetch the election admin address
        const electionAdminAddress = await contract.admin()
        setElectionAdmin(electionAdminAddress);

        // Fetch the election candidates
        const electionCandidates = await contract.getElectionCandidates()
        setElectionCandidates(electionCandidates);

        // Fetch eligible voters
        const eligibleVoters = await contract.getEligibleVoters()
        setEligibleVoters(eligibleVoters);

        // Fetch voters who have voted
        const votersWhoHaveVoted = await contract.getVotersWhoHaveVoted()
        setVotersWhoHaveVoted(votersWhoHaveVoted);

        // Fetch voters who have not voted
        const votersWhoHaveNotVoted = await contract.getVotersWhoHaveNotVoted()
        setVotersWhoHaveNotVoted(votersWhoHaveNotVoted);
    };
    init();
  }, []);

  return (
    <ContractContext.Provider value={{ token, electionAdmin, electionCandidates, eligibleVoters, votersWhoHaveVoted, votersWhoHaveNotVoted }}>
      {children}
    </ContractContext.Provider>
  );
};