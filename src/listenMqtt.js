const mqtt = require('mqtt');
const websocket = require('websocket-stream');
const log = require('npmlog');
const { v4: uuidv4 } = require("uuid");

// Topics jo hum sunenge
const topics = [
    "/t_ms",
    "/thread_typing",
    "/orca_typing_notifications",
    "/orca_presence",
    "/legacy_web",
    "/br_sr",
    "/sr_res",
    "/webrtc",
    "/onevc",
    "/notify_disconnect",
    "/inbox",
    "/mercury",
    "/messaging_events",
    "/orca_message_notifications",
    "/pp",
    "/webrtc_response",
];

function listenMqtt(defaultFuncs, api, ctx, globalCallback) {
    const sessionID = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;
    const chatOn = true; 

    // 1. Username JSON (Isme hum FB ko batate hain hum kaun hain)
    const username = {
        u: ctx.userID,
        s: sessionID,
        chat_on: chatOn,
        fg: false,
        d: uuidv4(), // GUID
        ct: 'websocket',
        aid: '219994525426954', // Messenger App ID
        mqtt_sid: '',
        cp: 3,
        ecp: 10,
        st: [],
        pm: [],
        dc: '',
        no_auto_fg: true,
        gas: null,
        pack: [],
        a: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        p: null,
        php_override: ""
    };

    // 2. Cookie formatting
    const cookies = ctx.jar.map(c => `${c.key}=${c.value}`).join("; ");

    // 3. Connection Options
    const host = 'wss://edge-chat.facebook.com/chat?sid=' + sessionID;
    const options = {
        clientId: 'mqttwsclient',
        protocolId: 'MQIsdp',
        protocolVersion: 3,
        username: JSON.stringify(username),
        clean: true,
        wsOptions: {
            headers: {
                'Cookie': cookies,
                'Origin': 'https://www.facebook.com',
                'User-Agent': username.a,
                'Referer': 'https://www.facebook.com/',
                'Host': 'edge-chat.facebook.com'
            },
            origin: 'https://www.facebook.com',
            protocolVersion: 13,
            binaryType: 'arraybuffer',
        },
        keepalive: 10,
        reschedulePings: true
    };

    // 4. Start Connection
    const client = new mqtt.Client(_ => websocket(host, options.wsOptions), options);
    ctx.mqttClient = client;

    // --- EVENTS ---

    client.on('error', function(err) {
        log.error("FCA-AMAN", "MQTT Error:", err);
        client.end();
        // Simple reconnect logic
        setTimeout(() => listenMqtt(defaultFuncs, api, ctx, globalCallback), 5000);
    });

    client.on('connect', function() {
        log.info("FCA-AMAN", "Connected to MQTT (Listening...)");
        
        // Topics subscribe karo
        topics.forEach(topic => client.subscribe(topic));

        // Sync Queue banau (Ye zaruri handshake hai)
        const queue = {
            sync_api_version: 10,
            max_deltas_able_to_process: 1000,
            delta_batch_size: 500,
            encoding: "JSON",
            entity_fbid: ctx.userID,
            initial_titan_sequence_id: ctx.lastSeqId || null,
            device_params: null
        };

        client.publish("/messenger_sync_create_queue", JSON.stringify(queue), { qos: 1, retain: false });
    });

    client.on('message', function(topic, message) {
        try {
            const jsonMessage = JSON.parse(message);

            if (topic === "/t_ms") {
                // Sequence ID update karo taaki agla message miss na ho
                if (jsonMessage.firstDeltaSeqId) ctx.lastSeqId = jsonMessage.firstDeltaSeqId;
                if (jsonMessage.lastIssuedSeqId) ctx.lastSeqId = jsonMessage.lastIssuedSeqId;

                // Messages process karo
                if (jsonMessage.deltas) {
                    jsonMessage.deltas.forEach(delta => {
                        // Agar New Message hai
                        if (delta.class === "NewMessage") {
                            const messageObj = {
                                type: "message",
                                senderID: delta.messageMetadata.actorFbId,
                                body: delta.body || "",
                                threadID: (delta.messageMetadata.threadKey.threadFbId || delta.messageMetadata.threadKey.otherUserFbId).toString(),
                                messageID: delta.messageMetadata.messageId,
                                timestamp: delta.messageMetadata.timestamp,
                                isGroup: !!delta.messageMetadata.threadKey.threadFbId
                            };
                            globalCallback(null, messageObj);
                        }
                    });
                }
            }
        } catch (e) {
            log.error("FCA-AMAN", "Parse Error", e);
        }
    });
}

module.exports = function(defaultFuncs, api, ctx) {
    return function(callback) {
        // Callback set karo
        const globalCallback = callback || function() {};
        listenMqtt(defaultFuncs, api, ctx, globalCallback);
    };
};
