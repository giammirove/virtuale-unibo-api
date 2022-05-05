const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require("fs")
const { printInfo, printError, readInput } = require("./utils");


const LOGIN = "https://virtuale.unibo.it/login/index.php"
let COOKIE_FILE = __dirname + '/cookie.json'



function getClientRequestId(body) {
    let reg = (/(&client-request-id=.*?)"/gm)
    let res = reg.exec(body);
    if (res && res.length > 1) {
        return res[1];
    }
    throw "Client-Request-Id not found!"
}

function getMSISAuth(res) {
    let msis = res.headers.get("set-cookie");
    msis = msis.replace(msis.substr(msis.indexOf(";")), "")
    return msis;
}

function getSAMLResponse(body) {
    let reg = (/SAMLResponse" value="(.*?)"/gm)
    let res = reg.exec(body);
    if (res && res.length > 1) {
        return res[1];
    }
    throw "SAML RESPONSE not found!"
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

async function resetCookieToFile() {
    try {
        let json = JSON.parse(`{"cookie":""}`)
        fs.writeFileSync(COOKIE_FILE, JSON.stringify(json));
    } catch (e) {
        throw e;
    }
}


async function login(user, pass) {
    try {
        let c = await getCookieFromFile();
        if (c != undefined && c != "")
            return c;
    } catch (e) {
        printError("Cookie non trovati o invalidi!");
    }
    try {
        printInfo("Login");
        if (!user || !pass) {
            user = await readInput("Inserisci il tuo username : ");
            pass = await readInput("Inserisci la tua password : ");
        }

        cookie = "";
        let res = await fetch(LOGIN, {
            "redirect": "manual"
        });
        let location = res.headers.get("location");
        cookie += "; " + res.headers.get("set-cookie");
        res = await fetch(location, {
            headers: {
                cookie: cookie,
            },
            "redirect": "manual"
        });
        location = res.headers.get("location");
        cookie += "; " + res.headers.get("set-cookie");
        res = await fetch(location, {
            headers: {
                cookie: cookie,
            },
            "redirect": "manual"
        });
        cookie += "; " + res.headers.get("set-cookie");
        let html = await res.text();
        let url = res.url;

        let clientid = getClientRequestId(html);
        url += clientid

        res = await fetch(url, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-language": "en-US,en;q=0.9,it;q=0.8",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"101\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Linux\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",

                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
                "cookie": cookie,
                "Referer": "https://idp.unibo.it/adfs/ls/?SAMLRequest=fZFBU4MwEIX%2FCpN7CYQCNVOYwfZgZ6oyBT14cQJNJTMhwWyo%2Bu%2BloNN6sOd9%2B723b5fAWtnRrLeN2vH3noN1PlupgI6DBPVGUc1AAFWs5UBtTYvsfkuJ69HOaKtrLZGTAXBjhVYrraBvuSm4OYqaP%2B22CWqs7YBifBTG9kxyt1ei0q6wuGhEVWnJbeMCaHwCE5w%2FFiVy1kMSodiJeSaIfXdeZvsDYAkYOZt1gl4XFQmiIPbrOPBjcgh5PQ%2BiyF%2FEh4VHonk1yAB6vlFgmbIJIh4hMy%2BceUHp39AwpKH3gpz856RbofZCvV2%2Fv5pEQO%2FKMp9NuZ%2B5gTHzIEDp8tQiHY3NRa%2FXsey3TJT%2BW90SX5Anm44%2BDKjNOtdS1F9OJqX%2BWBnOLE%2BQj3A6rfz9dfoN&RelayState=https%3A%2F%2Fvirtuale.unibo.it%2Fauth%2Fshibboleth%2Findex.php%3FspidL%3D1%26spidACS%3D0&SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256&Signature=Ehr%2B14ARKk1t7clWoyzpGn3amhyD3bVkkEEz6v99DBIqj0hizv4XUHa7vgeIzpBaBziUG7cNmoJ69Ea%2B%2FV7ns7Rx4veQ%2F%2BJfYS%2FjZXGAuxShPOT8CnZGe3ufhcec3UDDDPRe0keNQJVUlI6y5v3Dt1fNBGdc2Q9mTdUl5gahmNoflJdmhVToeK8Lk4JbH3G6EcX6g6MYsg%2BICfZD5ULe3dBRcE1WzvxyFcgpZY0vLFzXgoSuDOAzg4W8XC2yvkA3GXn3FJ7Bmapho4%2FsEWMc8LUrjFMVMpcDYaIsVPE1uTwXr%2F80ZliRdqI4fVbT9f97hQKAReTeiguV1zuygoPZu58%2BdY5FPFHl9A6LfT3AuXUy%2By%2F8%2B6%2FXOaqelnBtD76NyGPpTCk%2BwzL%2BGcqnoMSKEjTryShhMxWsn1ihBTCHn3Ucq6wv0MDiOMPJ38hfMp%2FWi5THuW2WrIfdD3SqcYOjXkopf%2BSTXJE9VA4hofWuIMfaKnuYZWbbxW4MUufpM3PA",
                "Referrer-Policy": "no-referrer-when-downgrade"
            },
            "body": "HomeRealmSelection=AD+AUTHORITY&Email=",
            "method": "POST"
        });
        let authUrl = res.url;
        cookie += "; " + res.headers.get("set-cookie");

        res = await fetch(authUrl, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-language": "en-US,en;q=0.9,it;q=0.8",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"101\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Linux\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
                "cookie": cookie,
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
            },
            "body": `UserName=${encodeURIComponent(user)}&Password=${encodeURIComponent(pass)}&AuthMethod=FormsAuthentication`,
            "method": "POST",
            "redirect": "manual"
        });
        location = res.headers.get("location");
        let msis = getMSISAuth(res);

        res = await fetch(location, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-language": "en-US,en;q=0.9,it;q=0.8",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"101\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Linux\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",

                "cookie": msis + ";" + cookie,
                "Referer": "https://idp.unibo.it/adfs/ls/?SAMLRequest=fZFBU4MwEIX%2FCpN7CYQCNVOYwfZgZ6oyBT14cQJNJTMhwWyo%2Bu%2BloNN6sOd9%2B723b5fAWtnRrLeN2vH3noN1PlupgI6DBPVGUc1AAFWs5UBtTYvsfkuJ69HOaKtrLZGTAXBjhVYrraBvuSm4OYqaP%2B22CWqs7YBifBTG9kxyt1ei0q6wuGhEVWnJbeMCaHwCE5w%2FFiVy1kMSodiJeSaIfXdeZvsDYAkYOZt1gl4XFQmiIPbrOPBjcgh5PQ%2BiyF%2FEh4VHonk1yAB6vlFgmbIJIh4hMy%2BceUHp39AwpKH3gpz856RbofZCvV2%2Fv5pEQO%2FKMp9NuZ%2B5gTHzIEDp8tQiHY3NRa%2FXsey3TJT%2BW90SX5Anm44%2BDKjNOtdS1F9OJqX%2BWBnOLE%2BQj3A6rfz9dfoN&RelayState=https%3A%2F%2Fvirtuale.unibo.it%2Fauth%2Fshibboleth%2Findex.php%3FspidL%3D1%26spidACS%3D0&SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256&Signature=Ehr%2B14ARKk1t7clWoyzpGn3amhyD3bVkkEEz6v99DBIqj0hizv4XUHa7vgeIzpBaBziUG7cNmoJ69Ea%2B%2FV7ns7Rx4veQ%2F%2BJfYS%2FjZXGAuxShPOT8CnZGe3ufhcec3UDDDPRe0keNQJVUlI6y5v3Dt1fNBGdc2Q9mTdUl5gahmNoflJdmhVToeK8Lk4JbH3G6EcX6g6MYsg%2BICfZD5ULe3dBRcE1WzvxyFcgpZY0vLFzXgoSuDOAzg4W8XC2yvkA3GXn3FJ7Bmapho4%2FsEWMc8LUrjFMVMpcDYaIsVPE1uTwXr%2F80ZliRdqI4fVbT9f97hQKAReTeiguV1zuygoPZu58%2BdY5FPFHl9A6LfT3AuXUy%2By%2F8%2B6%2FXOaqelnBtD76NyGPpTCk%2BwzL%2BGcqnoMSKEjTryShhMxWsn1ihBTCHn3Ucq6wv0MDiOMPJ38hfMp%2FWi5THuW2WrIfdD3SqcYOjXkopf%2BSTXJE9VA4hofWuIMfaKnuYZWbbxW4MUufpM3PA&client-request-id=d54c8f0e-c542-4e86-1f9a-0080010800a9&RedirectToIdentityProvider=AD+AUTHORITY",
                "Referrer-Policy": "no-referrer-when-downgrade"
            },
            "method": "GET",
            "redirect": "manual"
        });
        html = await res.text();
        let auth_cookie = res.headers.get("set-cookie").replace(/,/gm, ";");

        let samlresponse = encodeURIComponent(getSAMLResponse(html));
        res = await fetch("https://virtuale.unibo.it:443/Shibboleth.sso/SAML2/POST", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-language": "en-US,en;q=0.9,it;q=0.8",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"101\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Linux\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-site",
                "upgrade-insecure-requests": "1",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",

                "cookie": auth_cookie,
                "Referer": "https://idp.unibo.it/adfs/ls/?SAMLRequest=fZFBU4MwEIX%2FCpN7CYQCNVOYwfZgZ6oyBT14cQJNJTMhwWyo%2Bu%2BloNN6sOd9%2B723b5fAWtnRrLeN2vH3noN1PlupgI6DBPVGUc1AAFWs5UBtTYvsfkuJ69HOaKtrLZGTAXBjhVYrraBvuSm4OYqaP%2B22CWqs7YBifBTG9kxyt1ei0q6wuGhEVWnJbeMCaHwCE5w%2FFiVy1kMSodiJeSaIfXdeZvsDYAkYOZt1gl4XFQmiIPbrOPBjcgh5PQ%2BiyF%2FEh4VHonk1yAB6vlFgmbIJIh4hMy%2BceUHp39AwpKH3gpz856RbofZCvV2%2Fv5pEQO%2FKMp9NuZ%2B5gTHzIEDp8tQiHY3NRa%2FXsey3TJT%2BW90SX5Anm44%2BDKjNOtdS1F9OJqX%2BWBnOLE%2BQj3A6rfz9dfoN&RelayState=https%3A%2F%2Fvirtuale.unibo.it%2Fauth%2Fshibboleth%2Findex.php%3FspidL%3D1%26spidACS%3D0&SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256&Signature=Ehr%2B14ARKk1t7clWoyzpGn3amhyD3bVkkEEz6v99DBIqj0hizv4XUHa7vgeIzpBaBziUG7cNmoJ69Ea%2B%2FV7ns7Rx4veQ%2F%2BJfYS%2FjZXGAuxShPOT8CnZGe3ufhcec3UDDDPRe0keNQJVUlI6y5v3Dt1fNBGdc2Q9mTdUl5gahmNoflJdmhVToeK8Lk4JbH3G6EcX6g6MYsg%2BICfZD5ULe3dBRcE1WzvxyFcgpZY0vLFzXgoSuDOAzg4W8XC2yvkA3GXn3FJ7Bmapho4%2FsEWMc8LUrjFMVMpcDYaIsVPE1uTwXr%2F80ZliRdqI4fVbT9f97hQKAReTeiguV1zuygoPZu58%2BdY5FPFHl9A6LfT3AuXUy%2By%2F8%2B6%2FXOaqelnBtD76NyGPpTCk%2BwzL%2BGcqnoMSKEjTryShhMxWsn1ihBTCHn3Ucq6wv0MDiOMPJ38hfMp%2FWi5THuW2WrIfdD3SqcYOjXkopf%2BSTXJE9VA4hofWuIMfaKnuYZWbbxW4MUufpM3PA&client-request-id=d54c8f0e-c542-4e86-1f9a-0080010800a9&RedirectToIdentityProvider=AD+AUTHORITY",
                "Referrer-Policy": "no-referrer-when-downgrade"
            },
            "body": `SAMLResponse=${samlresponse}&RelayState=https%3A%2F%2Fvirtuale.unibo.it%2Fauth%2Fshibboleth%2Findex.php%3FspidL%3D1%26spidACS%3D0`,
            "method": "POST",
            "redirect": "manual"
        });

        let shibsession = res.headers.get("set-cookie").replace(/,/gm, ";");
        location = res.headers.get("location");


        res = await fetch(location, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-language": "en-US,en;q=0.9,it;q=0.8",
                "cache-control": "max-age=0",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"101\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Linux\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-site",
                "upgrade-insecure-requests": "1",
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36",
                "cookie": shibsession
            },
            "body": null,
            "method": "GET",
            "redirect": "manual"
        });

        SESSION_COOKIE = res.headers.get("set-cookie").replace(/,/gm, ";") + ";";

        printInfo("Login completato!");
        setCookieToFile(SESSION_COOKIE);
        return SESSION_COOKIE;
    } catch (e) {
        throw(e);
    }
}

module.exports = {
    login, resetCookieToFile
}