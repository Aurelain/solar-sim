import fs from 'node:fs';
import walk from '../utils/walk.js';
import projectRoot from '../utils/projectRoot.js';
import assume from '../utils/assume.js';

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CSV_DIR = projectRoot + '/scripts/consolidate-prices/input';
const OUTPUT_FILE = projectRoot + '/docs/artifacts/PRICES.js';

/*
{
    1: '00:15',
    2: '00:30',
    3: '00:45',
    4: '01:00',
    ...
}
 */
const INTERVAL_TO_TIME = generateTimes();

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * 1. Obtain csv files by downloading (with download-bulk) from
 * https://www.opcom.ro/rapoarte-pzu-raportPIP-export-csv/DD/MM/YYYY/ro
 * 2. Run `npm run consolidate-prices` to compile them into 365x96 rows
 */
function main() {
    const paths = walk(CSV_DIR);
    const output = {};
    for (const path of paths) {
        Object.assign(output, parseCsv(path));
    }
    const content = 'window.PRICES = ' + JSON.stringify(output, null, 4) + ';';
    console.log('content:', content);
    fs.writeFileSync(OUTPUT_FILE, content);
    console.log(`Done, see ${OUTPUT_FILE}.`);
}

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

/**
 *
 */
function generateTimes() {
    const output = {};
    for (let i = 0; i < 24; i++) {
        const hour = String(i).padStart(2, '0');
        const j = i * 4;
        if (i) {
            output[j] = hour + ':00';
        }
        output[j + 1] = hour + ':15';
        output[j + 2] = hour + ':30';
        output[j + 3] = hour + ':45';
    }
    output[96] = '24:00';
    return output;
}

/**
 *
 */
function parseCsv(path) {
    const date = path.match(/(\d[\d-]+)/)[1];
    const output = {};
    const content = fs.readFileSync(path, 'utf8');
    let lines = Array.from(content.matchAll(/Romania","(\d+)","(.*?)"/g));
    const {length} = lines;
    switch (length) {
        case 23:
            lines = fixDstMissingHour(lines);
            lines = fixGranularIntervals(lines);
            break;
        case 24:
            lines = fixGranularIntervals(lines);
            break;
        case 96:
            // This is normal.
            break;
        case 100:
            lines = fixDstExtraQuarters(lines);
            // This is normal.
            break;
        default:
            assume(false, `Unexpected number of intervals (${length})!`, path);
    }
    for (const line of lines) {
        const [, interval, price] = line;
        const key = date + '_' + INTERVAL_TO_TIME[interval];
        output[key] = Number(price);
    }
    return output;
}

/**
 *
 */
function fixGranularIntervals(lines) {
    const fixed = [];
    let previousPrice = Number(lines[0][2]);
    for (const line of lines) {
        const interval = line[1];
        const price = Number(line[2]);
        const actualInterval = interval * 4; // 1 becomes 4, 2 becomes 8 etc.
        const step = (price - previousPrice) / 4;
        fixed.push(
            [null, actualInterval - 3, Number(previousPrice + step).toFixed(2)],
            [null, actualInterval - 2, Number(previousPrice + step * 2).toFixed(2)],
            [null, actualInterval - 1, Number(previousPrice + step * 3).toFixed(2)],
            [null, actualInterval, price],
        );
        previousPrice = price;
    }
    return fixed;
}

/**
 *
 */
function fixDstMissingHour(lines) {
    const fixed = lines.slice();
    fixed.splice(2, 0, fixed[2].slice());
    for (let i = 0; i < fixed.length; i++) {
        fixed[i][1] = i+1;
    }
    return fixed;
}

/**
 *
 */
function fixDstExtraQuarters(lines) {
    const fixed = lines.slice();
    fixed.splice(2*4, 4);
    return fixed;
}

// =====================================================================================================================
//  R U N
// =====================================================================================================================
main();
