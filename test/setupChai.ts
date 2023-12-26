
import chai from "chai";
import { toBN } from "web3-utils";
import chaiAsPromised from "chai-as-promised";

const chaiBN = require('chai-bn')(toBN);

chai.use(chaiBN);
chai.use(chaiAsPromised);

export default chai;