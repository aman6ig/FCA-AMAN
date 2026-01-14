const { v4: uuidv4 } = require("uuid");
const log = require("npmlog");

module.exports = function(defaultFuncs, api, ctx) {
  return function sendMessage(msg, threadID, callback) {
    if (!callback) callback = function() {};
    
    // Agar msg simple text hai
    if (typeof msg === "string") {
      msg = { body: msg };
    }

    // Facebook ko jo Form Data bhejna hai
    const form = {
      client: "mercury",
      action_type: "ma-type:user-generated-message",
      author: "fbid:" + ctx.userID,
      timestamp: Date.now(),
      source: "source:chat:web",
      body: msg.body,
      ui_push_phase: "V3",
      offline_threading_id: uuidv4(),
      message_id: uuidv4(),
      threading_id: uuidv4(),
      ephemeral_ttl_mode: "0",
      has_attachment: false,
      signatureID: "3c365f57"
    };

    // Kisko bhejna hai (Thread ID)
    form["other_user_fbid"] = threadID;

    // Utils.post use karke request bhejo
    defaultFuncs
      .post("https://www.facebook.com/messaging/send/", ctx.jar, form, ctx)
      .then(function(data) {
        return callback(null, data);
      })
      .catch(function(err) {
        log.error("sendMessage", err);
        return callback(err);
      });
  };
};
