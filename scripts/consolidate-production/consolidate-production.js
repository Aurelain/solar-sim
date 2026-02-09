import fs from 'node:fs';
import walk from '../utils/walk.js';
import projectRoot from '../utils/projectRoot.js';

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CSV_DIR = projectRoot + '/scripts/consolidate-production/input';
const OUTPUT_FILE = projectRoot + '/docs/PRODUCTION.js';
const SNAP_MINUTES = {
    '05': '15',
    '10': '15',
    '15': '15',
    '20': '30',
    '25': '30',
    '30': '30',
    '35': '45',
    '40': '45',
    '45': '45',
    '50': '00',
    '55': '00',
    '00': '00',
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * 1. Obtain csv files from Solarman (with detailed download for every 30 days)
 * 2. Run `npm run consolidate-production` to compile intervals of 15 minutes that had production
 */
function main() {
    const paths = walk(CSV_DIR);
    const output = {};
    for (const path of paths) {
        Object.assign(output, parseCsv(path));
    }
    const content = 'window.PRODUCTION = ' + JSON.stringify(output, null, 4) + ';';
    // console.log('content:', content);
    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`Done, see ${OUTPUT_FILE}.`);
}

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
function parseCsv(path) {
    const output = {};
    const content = fs.readFileSync(path, 'utf8');
    const lines = Array.from(content.matchAll(/(\d+)\/(\d+)\/(\d+) (\d+:\d+)\tUTC.*?\t([\d.]+)/g));
    for (const line of lines) {
        const [, year, month, day, time, production] = line;
        const nr = Number(production);
        if (!nr) {
            continue;
        }
        const quarteredTime = getQuarterFromTime(time);
        const key = `${year}-${month}-${day}_${quarteredTime}`;
        output[key] = output[key] || [];
        output[key].push(nr);
    }
    computeAverages(output);
    return output;
}

/**
 *
 */
function getQuarterFromTime(time) {
    const [hour, minutes] = time.split(':');
    const actualMinutes = SNAP_MINUTES[minutes];
    const actualHour = minutes === '50' || minutes === '55' ? String(Number(hour) + 1).padStart(2, '0') : hour;
    return actualHour + ':' + actualMinutes;
}

/**
 *
 */
function computeAverages(hub) {
    for (const key in hub) {
        const values = hub[key];
        hub[key] = Number(Number(sum(values) / values.length).toFixed(2));
    }
}

/**
 *
 */
function sum(list) {
    return list.reduce((partialSum, a) => partialSum + a, 0);
}

// =====================================================================================================================
//  R U N
// =====================================================================================================================
main();
