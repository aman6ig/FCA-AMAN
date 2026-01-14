const utils = require("./utils");
const log = require("npmlog");
const cheerio = require("cheerio");

function login(appState, callback) {
    let jar = null;

    // 1. AppState (Cookies) Check
    try {
        if (appState) {
            jar = appState; 
        } else {
            return callback({ error: "FCA-AMAN: AppState is missing!" });
        }
    } catch (e) {
        return callback({ error: "FCA-AMAN: Invalid AppState format." });
    }

    // 2. Context (Data jo har function me use hoga)
    const ctx = {
        userID: null,
        jar: jar,
        loggedIn: false,
        fb_dtsg: null,
        jazoest: null,
        mqttClient: null
    };

    // 3. API Object (Jo user ko milega)
    const api = {
        getAppState: () => appState
    };

    // 4. Default Funcs (Utils ko pass karne ke liye)
    const defaultFuncs = utils;

    log.info("FCA-AMAN", "Logging in...");

    // 5. Facebook se Token (fb_dtsg) nikalna
    utils.get("https://www.facebook.com/", jar, null, ctx)
    .then(function(body) {
        const $ = cheerio.load(body);
        
        // Scraping fb_dtsg
        let dtsg = $('input[name="fb_dtsg"]').val();
        if(!dtsg) {
            // Regex backup agar html se na mile
            let match = body.match(/"DTSGInitialData",\[\],{"token":"(.*?)"/);
            if(match && match[1]) dtsg = match[1];
        }

        // Scraping UserID
        let uid = null;
        let cookieStr = JSON.stringify(appState);
        let uidMatch = cookieStr.match(/c_user=(\d+)/); // Cookies se ID nikalo
        if(uidMatch && uidMatch[1]) uid = uidMatch[1];

        if (!dtsg || !uid) {
            throw new Error("Login Failed! fb_dtsg ya UserID nahi mila. AppState check karo.");
        }

        // Context Setup
        ctx.fb_dtsg = dtsg;
        ctx.userID = uid;
        ctx.loggedIn = true;

        log.info("FCA-AMAN", `Login Successful! ID: ${ctx.userID}`);

        // 6. SRC Functions Load Karna (Yahan hum apne banaye hue features jodenge)
        
        // sendMessage load ho gaya
        api.sendMessage = require("./src/sendMessage")(defaultFuncs, api, ctx);

        // ✅ UPDATED: Ab listenMqtt bhi active hai
        api.listenMqtt = require("./src/listenMqtt")(defaultFuncs, api, ctx);

        return callback(null, api);
    })
    .catch(function(err) {
        log.error("FCA-AMAN", "Login Error:", err);
        return callback(err);
    });
}

module.exports = login;
