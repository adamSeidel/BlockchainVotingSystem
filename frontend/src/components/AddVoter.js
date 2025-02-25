import { useContract } from "../context/ContractProvider";

const addNewVoter = async (token) => {
    var newVoterAddress = document.getElementById("newVoterAddress").value;

    try {
        await token.giveRightToVote(newVoterAddress);

        const successMessage = "Voter " + newVoterAddress + " has been added successfully and is now eligible to vote";
        console.log(successMessage)
        document.getElementById("addVoterMessage").innerHTML = successMessage;

    } catch (error) {
        var errorMessage = error.reason;

        document.getElementById("addVoterMessage").innerHTML = "Error: " + errorMessage;
    }
};

const AddVoter = () => {
    const { token, electionAdmin } = useContract();

    return (
        <>
            <h1>Add Voter</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Only the <strong style={{ color: "red" }}>Election Admin</strong> with a blockchain address of <strong style={{ color: "red" }}>{electionAdmin}</strong> can add new voters</h3>
            </div>
            <div style={{ borderStyle: "solid", padding: '1rem 0', marginTop: "-1.5px"}}>
                        <input style={{ width: "400px" }} id="newVoterAddress" placeholder={"Enter New Voters Public Address Here"}></input>
                        <button onClick={() => addNewVoter(token)}>Add New Voter</button>
                <h3 id="addVoterMessage"> </h3>
                </div>
        </>
    );
};

export default AddVoter;