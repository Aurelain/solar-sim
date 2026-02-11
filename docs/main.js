// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const HISTORIC_CAPACITY = 3520; // 8 * 440W
const PRODUCTION_MANUAL_BOOST = 1.02; // 2% better when the panels are cleaned
const DETAILS = {
    interval: 'Moment',
    spotPzu: 'PZU',
    spotProduction: 'Panels',
    action: 'Action',
    battery: 'B',
    batteryPercent: 'B%',
}

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
window.onload = () => {
    write('production', computeAverageProduction(window.PRODUCTION));
    write('pzu', computeAveragePzu(window.PRICES));
    Array.from(document.querySelectorAll('select,input')).forEach((el) => el.addEventListener('change', run));
    run();
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
function computeAverageProduction(hub) {
    const byHour = {};
    for (const key in hub) {
        const hourlyKey = key.replace(/:\d+/, '');
        byHour[hourlyKey] = byHour[hourlyKey] || [];
        byHour[hourlyKey].push(hub[key]);
    }
    computeAverages(byHour, 4);
    const total = sum(Object.values(byHour));
    return Math.round(PRODUCTION_MANUAL_BOOST * total / HISTORIC_CAPACITY);
}

/**
 *
 */
function computeAveragePzu(hub) {
    const byHour = {};
    for (const key in hub) {
        let hourlyKey = key.replace(/:\d+/, '');
        hourlyKey = hourlyKey.replace(/24$/, '23');
        byHour[hourlyKey] = byHour[hourlyKey] || [];
        byHour[hourlyKey].push(hub[key]);
    }
    computeAverages(byHour, 4);
    const values = Object.values(byHour);
    const total = sum(values);
    const count = values.length;
    return Math.round(total / count);
}

/**
 *
 */
function run() {
    const config = collectConfig();
    const progress = compute(config);
    updateResults(progress);
    updateDetails(progress);
}

/**
 *
 */
function collectConfig() {
    const isDynamic = read('policy');
    hide('policy-static', isDynamic);
    hide('policy-dynamic', !isDynamic);
    return {
        production: window.PRODUCTION,
        panels: read('panels'),
        battery: read('battery'),
        minimumBattery: read('minimum-battery'),
        storageEfficiency: read('storage-efficiency'),
        batteryDepreciation: read('battery-depreciation'),
        isDynamic,
        staticPrice: read('static-price'),
        pzu: window.PRICES,
        minimumFeedPrice: read('minimum-feed-price'),
        maximumExtractionPrice: read('maximum-extraction-price'),
        deer: read('deer'),
        commission: read('commission'),
        cleaning: read('cleaning'),
        insurance: read('insurance'),
        admin: read('admin'),
        eur: read('eur'),
    };
}

/**
 *
 */
function updateResults(progress) {

}

/**
 *
 */
function updateDetails(progress) {
    const lines = [];
    lines.push('<table>');
    lines.push('<tr>');
    for (const key in DETAILS) {
        lines.push(`<th>${DETAILS[key]}</th>`);
    }
    lines.push('</tr>');
    for (const entry of progress) {
        lines.push('<tr>');
        for (const key in DETAILS) {
            lines.push(`<td>${entry[key]}</td>`);
        }
        lines.push('</tr>');
    }
    lines.push('</table>');
    write('dump', lines.join(''));
}

// =====================================================================================================================
//  U T I L S
// =====================================================================================================================
/**
 *
 */
function computeAverages(hub, forcedDenominator) {
    for (const key in hub) {
        const values = hub[key];
        const denominator = forcedDenominator || values.length;
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
function read(id) {
    return Number(document.getElementById(id).value) || 0;
}

/**
 *
 */
function write(id, value) {
    return document.getElementById(id).innerHTML = value.toString();
}

/**
 *
 */
function hide(id, force) {
    document.getElementById(id).classList.toggle('hidden', force);
}