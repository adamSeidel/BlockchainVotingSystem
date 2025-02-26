import { useContract } from "../context/ContractProvider";

const endElection = async (token) => {
    try {
        await token.endElection();
        console.log("The election has been ended successfully");
        document.getElementById("endElectionMessage").innerHTML = "The election has been ended successfully";
    } catch (error) {
        var errorMessage = error.reason;
        console.log(error)
        document.getElementById("endElectionMessage").innerHTML = "Error: " + errorMessage;
    }
}

const EndElection = () => {
    const { token } = useContract();

    return (
        <>
            <h1>End the Election</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Only the <strong style={{ color: "red" }}>UK Electoral Commission</strong> with a blockchain address of <strong style={{ color: "red" }}>xxx</strong> can end the election</h3>
            </div>
            <div style={{ borderStyle: "solid", padding: '1rem 0', marginTop: "-1.5px"}}>
            <button onClick={() => endElection(token)}>End Election</button>
            <h3 id="endElectionMessage"> </h3>
            </div>
        </>
    );
};

export default EndElection;