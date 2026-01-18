const utils = require("./utils");
const log = require("npmlog");
const fs = require("fs");
const login = require("./index"); // Ye internal logic handle karega agar tu future me add kare

// Basic Setup
log.maxRecordSize = 100;
function setOptions(globalOptions, options) {
    Object.keys(options).map(function (key) {
        switch (key) {
            case 'pauseLog':
                if (options.pauseLog) log.pause();
                break;
            case 'logLevel':
                log.level = options.logLevel;
                break;
            case 'logRecordSize':
                log.maxRecordSize = options.logRecordSize;
                break;
            case 'autoMarkDelivery':
                globalOptions.autoMarkDelivery = options.autoMarkDelivery;
                break;
            case 'userAgent':
                globalOptions.userAgent = (options.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                break;
        }
    });
}

// Main Runner
function buildAPI(globalOptions, html, jar) {
    const api = {
        getAppState: () => jar
    };
    
    // Yahan hum SRC folder ki files load karenge
    // Dhyan de: RDX wale src folder me sari files honi chahiye
    const srcPath = "./src";
    if(fs.existsSync(srcPath)) {
        fs.readdirSync(srcPath).forEach(file => {
            if (file.endsWith(".js")) {
                try {
                    const funcName = file.replace(".js", "");
                    // Har file ko API object me jod rahe hain
                    api[funcName] = require(srcPath + "/" + file)(utils, api, globalOptions, jar);
                } catch(e) {
                    // Agar koi file load na ho to ignore karo (Crash mat hone do)
                    // console.error("Skipping " + file); 
                }
            }
        });
    }

    return api;
}

// Exporting the Login Function
module.exports = function (appState, options, callback) {
    // Agar options nahi diye to empty object
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    
    // Default User Agent setup
    const globalOptions = {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };
    setOptions(globalOptions, options);

    // Fake Login Simulation (Since we are using AppState directly)
    // Asli magic 'src/listenMqtt.js' aur 'src/sendMessage.js' me hoga
    // Jo humne buildAPI me load kar liya hai.
    
    try {
        const api = buildAPI(globalOptions, null, appState);
        log.info("AMAN-FCA", "Engine Started Successfully! 🔥");
        callback(null, api);
    } catch (e) {
        log.error("AMAN-FCA", "Engine Error:", e);
        callback(e);
    }
};
