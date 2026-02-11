import fs from 'node:fs';
import walk from '../utils/walk.js';
import projectRoot from '../utils/projectRoot.js';

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CSV_DIR = projectRoot + '/scripts/consolidate-production/input';
const OUTPUT_FILE = projectRoot + '/docs/artifacts/PRODUCTION.js';
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
    const content = 'window.PRODUCTION = ' + printHub(output) + ';';
    fs.writeFileSync(OUTPUT_FILE, content);

    console.log(`Done, see ${OUTPUT_FILE}.`);
    // computeYearlyProduction(output);
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
function computeAverages(hub, forced) {
    for (const key in hub) {
        const values = hub[key];
        const denominator = forced || values.length;
        hub[key] = Number(Number(sum(values) / denominator));
    }
}

/**
 *
 */
function sum(list) {
    return list.reduce((partialSum, a) => partialSum + a, 0);
}

/**
 *
 */
function printHub(hub) {
    const lines = ['{'];
    for (const key in hub) {
        lines.push(`\t'${key}': ${hub[key].toFixed(2)},`);
    }
    lines.push('}');
    return lines.join('\n');
}

// noinspection JSUnusedLocalSymbols
/**
 *
 */
function computeYearlyProduction(hub) {
    const byHour = {};
    for (const key in hub) {
        const hourlyKey = key.replace(/:\d+/, '');
        byHour[hourlyKey] = byHour[hourlyKey] || [];
        byHour[hourlyKey].push(hub[key]);
    }
    computeAverages(byHour, 4);

    const byDay = {};
    const byMonth = {};
    for (const key in byHour) {
        const value = byHour[key];

        const dayKey = key.substring(0,10);
        byDay[dayKey] = byHour[dayKey] || 0;
        byDay[dayKey] += value;

        const monthKey = key.substring(0, 7);
        byMonth[monthKey] = byMonth[monthKey] || 0;
        byMonth[monthKey] += value;
    }

    const total = sum(Object.values(byMonth));
    console.log('byMonth:', printHub(byMonth));
    console.log('Total production:', Number(total / 1000).toFixed(3) + ' kWh');
}

// =====================================================================================================================
//  R U N
// =====================================================================================================================
main();
