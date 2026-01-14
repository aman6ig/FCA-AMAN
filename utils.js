const axios = require("axios");
const log = require("npmlog");

function getHeaders(url) {
    return {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://www.facebook.com/",
        "Origin": "https://www.facebook.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Connection": "keep-alive"
    };
}

function formatCookie(appState) {
    if (!appState) return "";
    if (Array.isArray(appState)) {
        return appState.map(c => `${c.key}=${c.value}`).join("; ");
    }
    return appState;
}

async function post(url, jar, form, ctx, customHeaders = {}) {
    const headers = { ...getHeaders(url), ...customHeaders };
    if (jar) headers["Cookie"] = formatCookie(jar);

    if (ctx) {
        form.fb_dtsg = ctx.fb_dtsg;
        form.jazoest = ctx.jazoest;
        form.__user = ctx.userID;
    }

    try {
        const response = await axios.post(url, new URLSearchParams(form), {
            headers: headers,
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        log.error("utils-post", error.message);
        throw error;
    }
}

async function get(url, jar, qs, ctx, customHeaders = {}) {
    const headers = { ...getHeaders(url), ...customHeaders };
    if (jar) headers["Cookie"] = formatCookie(jar);

    try {
        const response = await axios.get(url, {
            headers: headers,
            params: qs,
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        log.error("utils-get", error.message);
        throw error;
    }
}

module.exports = { post, get, getHeaders };

