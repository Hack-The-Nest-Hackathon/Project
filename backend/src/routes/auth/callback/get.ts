import { finishLogin } from "../../../auth.js";

export default {
  config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
  handler: finishLogin,
};
