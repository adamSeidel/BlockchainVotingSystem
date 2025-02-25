import { ethers } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";
import { useContract } from "../context/ContractProvider";

const LiveResults = () => {
    const { token, electionAdmin, electionCandidates } = useContract();

    return (
        <>
            <h1>Live Results</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Anyone can view the live election results as this information is stored publically on the blockchain</h3>
            </div>
            {electionCandidates.map((proposal, index) => {
            const name = ethers.decodeBytes32String(proposal.name);
            const voteCount = BigNumber.from(proposal.voteCount).toNumber();
            return (
                <div style={{ padding: '1rem 0' }}>
                <hr></hr>
                🗳 {name} - {Number(voteCount)}
                </div>
            );
            })}
        </>
    );
};

export default LiveResults;