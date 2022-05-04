function readInput(txt) {
    printQuestion(txt);
    return new Promise((resolve, reject) => {
        process.stdin.on('data', data => {
            resolve(data.toString().replace(/\n/gm, ""));
        });
    })
}

function sanitizeName(n) {
    return n.replace(/ /gm, "_").replace(/"/gm, '\"').replace(/'/gm, "_").replace(/,/gm, "_").replace(/:/gm, "_");
}

function printInfo(text) {
    console.log(`[-] ${text}`)
}

function printError(text) {
    console.log(`[x] ${text}`)
}

function printQuestion(text) {
    console.log(`[?] ${text}`)
}


module.exports = {
    sanitizeName, readInput, printInfo, printError, printQuestion
}