import {execSync} from 'child_process';

/**
 *
 */
const refresh = async () => {
    const browserId = findBrowser();
    if (!browserId) {
        console.log('Could not find browser!');
        return;
    }
    try {
        const editorId = execSync(`xdotool getwindowfocus`).toString().match(/\w+/)[0];
        execSync(`xdotool windowactivate ${browserId}`);
        await sleep(100);
        execSync(`xdotool key ctrl+r`);
        await sleep(100);
        execSync(`xdotool windowactivate ${editorId}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
};

/**
 *
 */
const findBrowser = () => {
    try {
        return execSync(`xdotool search --name " Chromium$"`).toString().match(/\w+/)[0];
    } catch (error) {
        // console.error('Error:', error.message);
    }
};

/**
 *
 */
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

// =====================================================================================================================
//  R U N
// =====================================================================================================================
await refresh();
