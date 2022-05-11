#!/usr/bin/env node

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require("fs")


const { login, resetCookieToFile } = require("./login")
const { printInfo, printError, sanitizeName, readInput } = require("./utils");


const LOGIN = "https://virtuale.unibo.it/login/index.php"
const MY = "https://virtuale.unibo.it/my/"
let SESSION_COOKIE = '';
let DIR = __dirname + "/data"


function getSections(dom) {
    return dom.querySelectorAll("[data-sectionid]");
}

function getSectionTitle(sec) {
    return sanitizeName(sec.getElementsByClassName("sectionname")[0].getElementsByTagName("a")[0].innerHTML)
}

function getSectionElements(sec) {
    return sec.getElementsByClassName("activityinstance");
}

function getLinkFromElement(el) {
    return el.getElementsByTagName("a")[0].href;
}

function getLabelFromElement(el) {
    let t = el.getElementsByClassName("instancename")[0].innerHTML;
    return sanitizeName(t.replace(t.substr(t.indexOf("<span")), ""));
}

async function getData(courseName, link, id) {
    try {
        printInfo(`Hai scelto '${courseName}'`);

        let res = await fetch(link, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "upgrade-insecure-requests": "1",
                "cookie": SESSION_COOKIE,
                "Referer": "https://virtuale.unibo.it/my/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });
        let html = await res.text();
        const dom = new JSDOM(html);
        let sections = getSections(dom.window.document);

        let sections_json = JSON.parse('[]')
        for (var i = 0; i < sections.length; i++) {
            let sec = sections[i];
            let title = getSectionTitle(sec);
            let elements = getSectionElements(sec);
            if (title != undefined && sec) {
                let s = JSON.parse(`{"title":"${title}","elements":[]}`);
                printInfo(`${i}. ${title}`);
                for (var j = 0; j < elements.length; j++) {
                    let link = getLinkFromElement(elements[j]);
                    let label = getLabelFromElement(elements[j]);
                    if (label != undefined && link != undefined) {
                        try {
                            let e = JSON.parse(`{"label":"${label}", "link":"${link}"}`);
                            s.elements.push(e);
                        } catch (e) {
                            printError(`Mhhh error qua : ${label}`);
                        }
                    }
                    //printInfo("\t" + label)
                    //await getFile(name, title, link);
                }
                sections_json.push(s);
            }
        }
        printInfo(`${sections.length}. Tutto`);

        let d = await readInput("Quale sezione vuoi scaricare? :");
        if (d >= sections_json.length) {
            await downloadAllSections(courseName, sections_json);
        } else {
            await downloadSection(courseName, sections_json[d]);
        }

        printInfo("Download terminato!");
        await getCourses();
    } catch (e) {
        printError(e);
    }
}

async function downloadAllSections(courseName, sections) {
    try {
        printInfo(`Scarico tutto da : ${courseName}`);
        for (var i = 0; i < sections.length; i++) {
            await downloadSection(courseName, sections[i]);
        }
    } catch (e) {
        throw e;
    }
}

async function downloadSection(courseName, section) {
    try {
        printInfo(`Scarico : ${section.title}`);
        for (var i = 0; i < section.elements.length; i++) {
            printInfo(`\t${section.elements[i].label}`);
            await getFile(courseName, section.title, section.elements[i].link);
        }
    } catch (e) {
        throw e;
    }
}



function getFileName(res) {
    let filename = res.headers.get("Content-disposition");
    filename = sanitizeName((/filename="(.*?)"/gm).exec(filename)[1]);
    return filename;
}

async function getFile(course, sectionName, url) {
    try {
        sectionName = sanitizeName(sectionName);
        let res = await fetch(url, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-language": "en-US,en;q=0.9,it;q=0.8",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"101\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Linux\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "cookie": SESSION_COOKIE,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        });
        try {
            let root = `${DIR}/${course}/${sectionName}`;
            let path = `${root}/${getFileName(res)}`;

            if (!fs.existsSync(`${root}`)) {
                fs.mkdirSync(`${root}`, { recursive: true });
            }

            const fileStream = fs.createWriteStream(path);
            await new Promise((resolve, reject) => {
                res.body.pipe(fileStream);
                res.body.on("error", reject);
                fileStream.on("finish", resolve);
            });
        } catch (e) {

        }
    } catch (e) {
        printInfo(e)
    }
}

function getSessKey(body) {
    let reg = (/"sesskey":"(.*?)"/gm)
    let res = reg.exec(body);
    if (res && res.length > 1) {
        return res[1];
    }
    throw "Sess Key not found!"
}



async function getCourses() {
    try {
        let res = await fetch("https://virtuale.unibo.it/my/", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-language": "en-US,en;q=0.9,it;q=0.8",
                "cache-control": "max-age=0",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"101\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Linux\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "none",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "cookie": SESSION_COOKIE
            },
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET"
        });
        let html = await res.text();
        fs.writeFileSync("test.html", html);

        let sesskey = getSessKey(html);


        res = await fetch(`https://virtuale.unibo.it/lib/ajax/service.php?sesskey=${sesskey}&info=local_uniboapi_get_enrolled_courses_unibo`, {
            "headers": {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "en-US,en;q=0.9,it;q=0.8",
                "content-type": "application/json",
                "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"101\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Linux\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest",
                "cookie": SESSION_COOKIE,
                "Referer": "https://virtuale.unibo.it/my/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": "[{\"index\":0,\"methodname\":\"local_uniboapi_get_enrolled_courses_unibo\",\"args\":{\"offset\":0,\"limit\":0,\"classification\":\"all\",\"sort\":\"fullname\",\"customfieldname\":\"aa\",\"customfieldvalue\":\"\"}}]",
            "method": "POST"
        });
        let json = await res.json();

        let courses = json[0].data.courses

        printInfo("CORSI TROVATI");
        for (var i = 0; i < courses.length; i++) {
            let name = courses[i].fullname;
            let link = courses[i].viewurl;
            let id = courses[i].id;

            printInfo(`${i}. (${id}) ${name}`);
        }


        let data = await readInput("Quale corso vuoi navigare? : ");

        await getData(courses[data].fullname, courses[data].viewurl, courses[data].id);


    } catch (e) {
        throw (e);
    }
}


async function menu() {
    try {
        SESSION_COOKIE = await login();
        await getCourses();
    } catch (e) {
        printError(e);
        await resetCookieToFile();
        await menu();
    }
}



menu();