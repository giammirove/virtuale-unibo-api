const fs = require("fs")

let COOKIE_FILE = 'cookie.json'

function readInput(txt) {
    console.log(txt);
    return new Promise((resolve, reject) => {
        process.stdin.on('data', data => {
            resolve(data.toString().replace(/\n/gm, ""));
        });
    })
}

function sanitizeName(n) {
    return n.replace(/ /gm, "_").replace(/"/gm, '\"').replace(/'/gm, "_").replace(/,/gm, "_").replace(/:/gm, "_");
}

async function getCookieFromFile() {
    try {
        if (fs.existsSync(COOKIE_FILE)) {
            let json = JSON.parse(fs.readFileSync(COOKIE_FILE));
            return json.cookie;
        } else {
            throw "Cookie non trovati!";
        }
    } catch (e) {
        throw e;
    }
}

async function setCookieToFile(cookie) {
    try {
        let json = JSON.parse(`{"cookie":"${cookie}"}`)
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(json));
    } catch (e) {
        throw e;
    }
}


module.exports = {
    sanitizeName, readInput, getCookieFromFile, setCookieToFile
}