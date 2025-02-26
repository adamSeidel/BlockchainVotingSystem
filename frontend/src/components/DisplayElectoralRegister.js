import { useContract } from "../context/ContractProvider";

const DisplayElectoralRegister = () => {
    const { eligibleVoters } = useContract();

    return (
        <>
            <h1>Display Electoral Register</h1>
            <div style={{ borderStyle: "solid"}}>
            <h3 style={{ fontWeight: "normal"}}>Only addresses listed below are <strong style={{ color: "red" }}>elgible</strong> to vote in this election</h3>
            </div>
            {eligibleVoters.map((address) => {
            return (
                <div style={{ padding: '1rem 0'}}>
                <hr></hr>
                {address}
                </div>
            );
            })}
        </>
    );
};

export default DisplayElectoralRegister;