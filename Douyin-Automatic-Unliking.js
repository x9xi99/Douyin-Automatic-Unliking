// ==========================
// 1. SDK key 解析（兼容新版，来自 2.js）
// ==========================
const possibleKeys = [
    'security-sdk/s_sdk_crypt_sdk',
    'security-sdk/s_sdk_cert_key',
    'security-sdk/s_sdk_server_cert_key',
];

function safeParse(str) {
    try { return JSON.parse(str); } catch { return null; }
}

function extract(raw) {
    if (!raw) return null;

    const obj = safeParse(raw);
    if (!obj) return null;

    if (obj.ec_privateKey && obj.ec_publicKey) return obj;

    if (obj.data) {
        const inner = typeof obj.data === "string"
            ? safeParse(obj.data)
            : obj.data;

        if (inner?.ec_privateKey && inner?.ec_publicKey) {
            return inner;
        }
    }

    return null;
}

function getKey() {
    // 优先从 localStorage 获取
    for (const k of possibleKeys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;

        console.log("🔍 checking:", k);

        const result = extract(raw);
        if (result) {
            console.log("✅ SDK found:", k);
            return {
                source: k,
                privateKey: result.ec_privateKey,
                publicKey: result.ec_publicKey
            };
        }
    }

    // localStorage 未命中，尝试 runtime
    console.warn("⚠️ localStorage 未命中，尝试 runtime...");

    const runtime = [
        window.web_secsdk_runtime_cache,
        window.SLARDARuc_secure_sdk,
        window.SLARDARdouyin_web
    ];

    for (const r of runtime) {
        const result = extract(JSON.stringify(r));
        if (result) {
            return {
                source: "runtime",
                privateKey: result.ec_privateKey,
                publicKey: result.ec_publicKey
            };
        }
    }

    return null;
}

// 初始化 key
const keyData = getKey();

if (!keyData) {
    console.error('No valid key data found in localStorage or runtime.');
    throw new Error('Required data missing in localStorage.');
}

console.log("✅ Key loaded from:", keyData.source);

// 提取 privateKey 和 publicKey
let privateKey = keyData.privateKey || '';
let publicKey = keyData.publicKey || '';

if (!privateKey || !publicKey) {
    console.error('Private or Public key is missing.');
    throw new Error('Keys are missing.');
}

console.log("Private Key: ", privateKey);
console.log("Public Key: ", publicKey);

// 继续执行后续操作，使用 privateKey 和 publicKey 进行加密或解密操作
let max_cursorTemp = 0;
let messageBox = undefined;

var count = 0;

// sleep 工具函数
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchAndCancelLikes(maxCursor = max_cursorTemp) {
    try {
        const response = await fetch(`https://www.douyin.com/aweme/v1/web/aweme/favorite?aid=6383&count=20&max_cursor=${max_cursorTemp}`, {
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        });
        const { aweme_list, max_cursor } = await response.json();
        max_cursorTemp = max_cursor;

        if (aweme_list != null) {
            const idsToCancel = aweme_list.map(({ aweme_id }) => aweme_id);
            let currCount = 0;
            
            // 串行处理，每个间隔 1 秒
            for (const id of idsToCancel) {
                await cancelLike(id, privateKey);
                currCount++;
                count++;
                await sleep(1000);  // 1 秒一个
            }
            
            if (messageBox != undefined) {
                document.body.removeChild(messageBox);
            }
            messageBox = showMessageBox(`本次执行取消${currCount}个点赞,共取消${count}个点赞,继续执行,如果不需要执行直接关闭浏览器,当前时间${new Date()}`);
        }

    } catch (error) {
        console.error('Error fetching and canceling likes:', error);
    }
    
    // 处理完一批后继续下一批
    fetchAndCancelLikes();
}

async function cancelLike(id, key) {
    try {
        await fetch("https://www.douyin.com/aweme/v1/web/commit/item/digg/?aid=6383", {
            "headers": {
                "accept": "application/json, text/plain, */*",
                "accept-language": "zh-CN,zh;q=0.9",
                "bd-ticket-guard-ree-public-key": key,
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            "referrer": "https://www.douyin.com/user/self?modal_id=7308336895358930212&showTab=like",
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": `aweme_id=${id}&item_type=0&type=0`,
            "method": "POST",
            "mode": "cors",
            "credentials": "include"
        });
    } catch (error) {
        console.error(`Error canceling like for aweme_id ${id}:`, error);
    }
}

// 启动
fetchAndCancelLikes();

function showMessageBox(mess) {
    var messageBox = document.createElement('div');
    messageBox.id = 'autoMessageBox';
    messageBox.style.position = 'fixed';
    messageBox.style.top = '50%';
    messageBox.style.left = '50%';
    messageBox.style.transform = 'translate(-50%, -50%)';
    messageBox.style.padding = '20px';
    messageBox.style.backgroundColor = '#3498db';
    messageBox.style.color = 'white';
    messageBox.style.borderRadius = '5px';
    messageBox.style.zIndex = '1000';
    messageBox.style.display = 'block';
    messageBox.textContent = mess;
    document.body.appendChild(messageBox);
    return messageBox;
}
