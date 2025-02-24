import LiveResults from "../components/LiveResults";
import AddVoter from "../components/AddVoter"
import DisplayElectoralRegister from "../components/DisplayElectoralRegister";
import VotersWhoHaveVoted from "../components/VotersWhoHaveVoted";
import VotersWhoHaveNotVoted from "../components/VotersWhoHaveNotVoted";
import EndElection from "../components/EndElection";
import DisplayResults from "../components/DisplayResults";

const Admin = () => {
    return (
      <>
        <h1>Admin</h1>

        <LiveResults />
        <AddVoter />
        <DisplayElectoralRegister />
        <VotersWhoHaveVoted />
        <VotersWhoHaveNotVoted />
        <EndElection />
        <DisplayResults />
      
      </>
    );
};
  
export default Admin;