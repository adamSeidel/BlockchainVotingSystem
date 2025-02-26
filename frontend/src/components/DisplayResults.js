import { ethers } from "ethers";
import { useContract } from "../context/ContractProvider";

const displayWinner = async (token) => {
    try {
        var winner = await token.getElectionWinner();
        winner = ethers.decodeBytes32String(winner);
        console.log("The winner of the election is: " + winner);
        document.getElementById("winner").innerHTML = "The winner of the election is: " + winner;
    } catch (error) {
        var errorMessage = error.reason;
        document.getElementById("winner").innerHTML = "Error: " + errorMessage;
    }
}

const DisplayResults = () => {
    const { token } = useContract();

    return (
        <>
            <h1>Display Election Results</h1>
            <div style={{ borderStyle: "solid", padding: '1rem 0', marginTop: "-1.5px"}}>
            <button onClick={() => displayWinner(token)}>Display Election Winner</button>
            <h3 id="winner"> </h3>
            </div>
        </>
    );
};

export default DisplayResults;